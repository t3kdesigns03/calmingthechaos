import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { ADDR, ENV, TX_ADDR, call, fresh, get, post } from "./helpers.mjs";
import quoteFn from "../netlify/functions/checkout-quote.mjs";
import createFn from "../netlify/functions/checkout-create-order.mjs";
import captureFn from "../netlify/functions/checkout-capture.mjs";
import webhookFn from "../netlify/functions/paypal-webhook.mjs";
import adminFn from "../netlify/functions/orders-admin.mjs";
import tokenFn from "../netlify/functions/paypal-client-token.mjs";
import { SHIPPING_FLAT_RATE_USD } from "../netlify/lib/config.mjs";

const ADMIN = { authorization: `Bearer ${ENV.ORDERS_ADMIN_TOKEN}` };
const CART = [{ sku: "emf-band", qty: 2 }, { sku: "device-chip", qty: 1 }]; // 2×49.95 + 39.95 = 139.85

async function placeOrder(method = "paypal", shipping = ADDR, items = CART) {
  const r = await call(createFn, post("/api/checkout/orders", { method, items, shipping }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
const capture = (orderId) => call(captureFn, post(`/api/checkout/orders/${orderId}/capture`, {}), { orderId });

function webhookReq(event) {
  return post("/api/paypal/webhook", JSON.stringify(event), {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
    "paypal-transmission-id": "tx-1",
    "paypal-transmission-sig": "sig",
    "paypal-transmission-time": "2026-11-13T20:00:00Z",
  });
}
const captureEvent = (id, type, orderId, captureId, value) => ({
  id,
  event_type: type,
  resource: { id: captureId, status: type.split(".").pop(), amount: { currency_code: "USD", value }, supplementary_data: { related_ids: { order_id: orderId } } },
});

test("shipping placeholder is $0.00 until the owner sets it", () => {
  assert.equal(SHIPPING_FLAT_RATE_USD, "0.00");
});

test("quote: prices come from the catalog, no tax outside Texas", async () => {
  fresh();
  const r = await call(quoteFn, post("/api/checkout/quote", { items: CART, shipping: ADDR }));
  assert.equal(r.status, 200);
  assert.equal(r.body.totals.subtotal, "139.85");
  assert.equal(r.body.totals.shipping, "0.00");
  assert.equal(r.body.totals.tax, "0.00");
  assert.equal(r.body.totals.total, "139.85");
});

test("quote: Texas ship-to adds 8.25% on items + shipping", async () => {
  fresh();
  const r = await call(quoteFn, post("/api/checkout/quote", { items: CART, shipping: TX_ADDR }));
  assert.equal(r.body.totals.tax, "11.54"); // 139.85 × 0.0825 = 11.537
  assert.equal(r.body.totals.total, "151.39");
});

test("quote: Texas orders refused when the tax rate is missing", async () => {
  fresh();
  const saved = ENV.TX_SALES_TAX_RATE;
  ENV.TX_SALES_TAX_RATE = "";
  try {
    const r = await call(quoteFn, post("/api/checkout/quote", { items: CART, shipping: TX_ADDR }));
    assert.equal(r.status, 503);
    assert.equal(r.body.code, "tax_unavailable");
  } finally {
    ENV.TX_SALES_TAX_RATE = saved;
  }
});

test("quote: client-sent prices are ignored; unknown SKUs and bad addresses rejected", async () => {
  fresh();
  let r = await call(quoteFn, post("/api/checkout/quote", { items: [{ sku: "emf-band", qty: 1, price: "0.01" }], shipping: ADDR }));
  assert.equal(r.body.totals.total, "49.95");
  r = await call(quoteFn, post("/api/checkout/quote", { items: [{ sku: "nope", qty: 1 }], shipping: ADDR }));
  assert.equal(r.status, 400);
  r = await call(quoteFn, post("/api/checkout/quote", { items: CART, shipping: { ...ADDR, zip: "abc", email: "x" } }));
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.fields.sort(), ["email", "zip"]);
  r = await call(quoteFn, post("/api/checkout/quote", { items: [{ sku: "emf-band", qty: 0 }], shipping: ADDR }));
  assert.equal(r.status, 400);
});

test("create order: server builds the PayPal order with items, shipping address and breakdown", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("paypal", TX_ADDR);
  const req = pp.orders.get(o.orderId).req;
  const pu = req.purchase_units[0];
  assert.equal(req.intent, "CAPTURE");
  assert.equal(pu.amount.value, "151.39");
  assert.deepEqual(pu.amount.breakdown.item_total, { currency_code: "USD", value: "139.85" });
  assert.deepEqual(pu.amount.breakdown.tax_total, { currency_code: "USD", value: "11.54" });
  assert.equal(pu.items.length, 2);
  assert.equal(pu.items[0].category, "PHYSICAL_GOODS");
  assert.equal(pu.shipping.address.admin_area_1, "TX");
  assert.equal(pu.shipping.address.postal_code, "79424");
  assert.equal(req.payment_source.paypal.experience_context.shipping_preference, "SET_PROVIDED_ADDRESS");
  assert.match(pu.custom_id, /^CTC-\d{6}-[A-Z0-9]{6}$/);
  assert.ok(store.keys("pending/").length === 1);
  assert.equal(store.keys("orders/").length, 0, "creating an order records nothing as paid");
});

test("create order: venmo / card / guest payloads", async () => {
  const { pp } = fresh();
  const v = await placeOrder("venmo");
  assert.equal(pp.orders.get(v.orderId).req.payment_source.venmo.experience_context.shipping_preference, "SET_PROVIDED_ADDRESS");
  const c = await placeOrder("card");
  assert.equal(pp.orders.get(c.orderId).req.payment_source.card.attributes.verification.method, "SCA_WHEN_REQUIRED");
  const g = await placeOrder("guest");
  assert.equal(pp.orders.get(g.orderId).req.application_context.shipping_preference, "SET_PROVIDED_ADDRESS");
  const bad = await call(createFn, post("/api/checkout/orders", { method: "bitcoin", items: CART, shipping: ADDR }));
  assert.equal(bad.status, 400);
});

test("capture: COMPLETED → PAID order in Blobs, visible to admin; second capture is idempotent", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("paypal");
  const r = await capture(o.orderId);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "PAID");
  assert.equal(r.body.reference, o.reference);
  const rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "PAID");
  assert.equal(rec.readyToFulfill, true);
  assert.equal(rec.captureId, `CAP${o.orderId.slice(-8)}`);
  assert.equal(rec.amount.value, "139.85");
  assert.equal(rec.shipping.line1, "123 Main St");
  assert.equal(rec.buyer.email, "buyer@example.com");
  assert.equal(rec.buyer.contactEmail, "pat@example.com");
  assert.equal(rec.items.length, 2);
  assert.ok(store.keys("captures/").length === 1);

  const capturesBefore = pp.calls.filter((c) => c.path.endsWith("/capture")).length;
  const again = await capture(o.orderId);
  assert.equal(again.body.status, "PAID");
  assert.equal(pp.calls.filter((c) => c.path.endsWith("/capture")).length, capturesBefore, "no second capture call");

  const list = await call(adminFn, get("/api/admin/orders", ADMIN));
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(list.body.orders[0].orderId, o.orderId);
  const one = await call(adminFn, get(`/api/admin/orders/${o.orderId}`, ADMIN), { orderId: o.orderId });
  assert.equal(one.body.order.reference, o.reference);
});

test("capture: declined card → plain-language error, nothing recorded as paid", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("card");
  pp.nextCapture = { http: 422, issue: "INSTRUMENT_DECLINED" };
  const r = await capture(o.orderId);
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, false);
  assert.equal(r.body.code, "declined");
  assert.match(r.body.message, /declined/i);
  assert.match(r.body.message, /not been charged/i);
  assert.equal(store.keys("orders/").length, 0);
});

test("capture: DECLINED capture status → error, nothing recorded as paid", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("guest");
  pp.nextCapture = { status: "DECLINED" };
  const r = await capture(o.orderId);
  assert.equal(r.body.ok, false);
  assert.equal(r.body.code, "declined");
  assert.equal(store.keys("orders/").length, 0);
});

test("capture: failed 3-D Secure → not captured", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("card");
  pp.authResult = { liability_shift: "NO", three_d_secure: { authentication_status: "N", enrollment_status: "Y" } };
  const r = await capture(o.orderId);
  assert.equal(r.body.ok, false);
  assert.equal(r.body.code, "card_not_verified");
  assert.equal(pp.calls.filter((c) => c.path.endsWith("/capture")).length, 0);
  assert.equal(store.keys("orders/").length, 0);
});

test("capture: amount mismatch is held for review, not marked ready to ship", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("paypal");
  pp.nextCapture = { amount: "0.01" };
  const r = await capture(o.orderId);
  assert.equal(r.body.status, "NEEDS_REVIEW");
  const rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.readyToFulfill, false);
});

test("capture: orders this site didn't create are refused without calling PayPal", async () => {
  const { pp } = fresh();
  const r = await capture("FAKEORDER123456");
  assert.equal(r.status, 404);
  assert.equal(pp.calls.length, 0);
});

test("webhook: unverified or unsigned deliveries change nothing", async () => {
  const { pp, store } = fresh();
  const o = await placeOrder("paypal");
  pp.verifyStatus = "FAILURE";
  let r = await call(webhookFn, webhookReq(captureEvent("WH-1", "PAYMENT.CAPTURE.COMPLETED", o.orderId, "CAP1", "139.85")));
  assert.equal(r.status, 400);
  r = await call(webhookFn, post("/api/paypal/webhook", JSON.stringify(captureEvent("WH-2", "PAYMENT.CAPTURE.COMPLETED", o.orderId, "CAP1", "139.85"))));
  assert.equal(r.status, 400);
  assert.equal(store.keys("orders/").length, 0);
  assert.equal(store.keys("events/").length, 0);
});

test("webhook: verification request carries the raw body and our webhook id", async () => {
  const { pp } = fresh();
  const raw = '{"id":"WH-raw","event_type":"SOMETHING.ELSE","resource":{"x":1.10}}';
  await call(webhookFn, post("/api/paypal/webhook", raw, { "paypal-auth-algo": "a", "paypal-cert-url": "b", "paypal-transmission-id": "c", "paypal-transmission-sig": "d", "paypal-transmission-time": "e" }));
  const v = pp.calls.find((c) => c.path === "/v1/notifications/verify-webhook-signature");
  assert.ok(v.body.includes(`"webhook_event":${raw}`), "raw event spliced in byte-for-byte");
  assert.equal(JSON.parse(v.body).webhook_id, "55355932J82817220");
});

test("webhook: verified CAPTURE.COMPLETED records the paid order; duplicates are ignored", async () => {
  const { store } = fresh();
  const o = await placeOrder("venmo");
  const ev = captureEvent("WH-3", "PAYMENT.CAPTURE.COMPLETED", o.orderId, "CAPWEB1", "139.85");
  let r = await call(webhookFn, webhookReq(ev));
  assert.equal(r.status, 200);
  const rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "PAID");
  assert.equal(rec.captureId, "CAPWEB1");
  r = await call(webhookFn, webhookReq(ev));
  assert.equal(r.body, "duplicate");
});

test("webhook: capture for an order we never created is parked as unmatched, not fulfilled", async () => {
  const { store } = fresh();
  const r = await call(webhookFn, webhookReq(captureEvent("WH-4", "PAYMENT.CAPTURE.COMPLETED", "SOMEONEELSE1234", "CAPX", "1.00")));
  assert.equal(r.status, 200);
  assert.equal(store.keys("orders/").length, 0);
  assert.equal(store.keys("unmatched/").length, 1);
});

test("webhook: PENDING then COMPLETED; DENIED after PENDING", async () => {
  const { store } = fresh();
  const o = await placeOrder("paypal");
  await call(webhookFn, webhookReq(captureEvent("WH-5", "PAYMENT.CAPTURE.PENDING", o.orderId, "CAPP", "139.85")));
  let rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "PAYMENT_PENDING");
  assert.equal(rec.readyToFulfill, false);
  await call(webhookFn, webhookReq(captureEvent("WH-6", "PAYMENT.CAPTURE.COMPLETED", o.orderId, "CAPP", "139.85")));
  rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "PAID");

  const o2 = await placeOrder("paypal");
  await call(webhookFn, webhookReq(captureEvent("WH-7", "PAYMENT.CAPTURE.PENDING", o2.orderId, "CAPQ", "139.85")));
  await call(webhookFn, webhookReq(captureEvent("WH-8", "PAYMENT.CAPTURE.DENIED", o2.orderId, "CAPQ", "139.85")));
  rec = await store.get(`orders/${o2.orderId}`, { type: "json" });
  assert.equal(rec.status, "DENIED");
  assert.equal(rec.readyToFulfill, false);
});

test("webhook: refunds mark the order refunded and a late COMPLETED can't undo it", async () => {
  const { store } = fresh();
  const o = await placeOrder("paypal");
  await capture(o.orderId);
  const capId = `CAP${o.orderId.slice(-8)}`;
  const refund = (id, value, total) => ({
    id,
    event_type: "PAYMENT.CAPTURE.REFUNDED",
    resource: {
      id: `RF-${id}`,
      amount: { currency_code: "USD", value },
      seller_payable_breakdown: { total_refunded_amount: { currency_code: "USD", value: total } },
      links: [{ rel: "up", href: `https://api.sandbox.paypal.com/v2/payments/captures/${capId}` }],
    },
  });
  await call(webhookFn, webhookReq(refund("WH-9", "40.00", "40.00")));
  let rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "PARTIALLY_REFUNDED");
  await call(webhookFn, webhookReq(refund("WH-10", "99.85", "139.85")));
  rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "REFUNDED");
  assert.equal(rec.readyToFulfill, false);
  await call(webhookFn, webhookReq(captureEvent("WH-11", "PAYMENT.CAPTURE.COMPLETED", o.orderId, capId, "139.85")));
  rec = await store.get(`orders/${o.orderId}`, { type: "json" });
  assert.equal(rec.status, "REFUNDED");
});

test("admin endpoint: refuses missing, wrong and empty tokens", async () => {
  fresh();
  assert.equal((await call(adminFn, get("/api/admin/orders"))).status, 401);
  assert.equal((await call(adminFn, get("/api/admin/orders", { authorization: "Bearer wrong" }))).status, 401);
  assert.equal((await call(adminFn, get("/api/admin/orders", { "x-admin-token": "" }))).status, 401);
  assert.equal((await call(adminFn, get("/api/admin/orders?token="))).status, 401);
  assert.equal((await call(adminFn, get(`/api/admin/orders?token=${ENV.ORDERS_ADMIN_TOKEN}`))).status, 200);
  assert.equal((await call(adminFn, get("/api/admin/orders", { "x-admin-token": ENV.ORDERS_ADMIN_TOKEN }))).status, 200);
  const saved = ENV.ORDERS_ADMIN_TOKEN;
  ENV.ORDERS_ADMIN_TOKEN = "";
  try {
    const r = await call(adminFn, get("/api/admin/orders?token="));
    assert.equal(r.status, 503);
  } finally {
    ENV.ORDERS_ADMIN_TOKEN = saved;
  }
});

test("client token endpoint returns a browser-safe token, never the secret", async () => {
  fresh();
  const r = await call(tokenFn, get("/api/paypal/client-token"));
  assert.equal(r.body.clientToken, "CLIENT_TOKEN");
  assert.ok(!JSON.stringify(r.body).includes(ENV.PAYPAL_CLIENT_SECRET));
});

test("catalog.json matches the prices on the product pages", () => {
  execFileSync(process.execPath, ["scripts/sync-catalog.mjs", "--check"], { stdio: "pipe" });
});
