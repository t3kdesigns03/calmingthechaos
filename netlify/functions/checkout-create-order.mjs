// POST /api/checkout/orders — creates the PayPal order server-side.
// Body: { method: "paypal"|"venmo"|"card"|"guest", items: [{ sku, qty }], shipping: {...} }
// Prices, shipping and tax are recomputed here; nothing price-related is taken from the browser.
import { paypalEnv } from "../lib/config.mjs";
import { HttpError, handle, json, readJson } from "../lib/http.mjs";
import { PAYMENT_METHODS, buildCreateOrderBody, newReference } from "../lib/orders.mjs";
import { siteOrigin } from "../lib/origin.mjs";
import { PayPalError, createOrder } from "../lib/paypal.mjs";
import { publicTotals, quote, validateShipping } from "../lib/pricing.mjs";
import { keys, putJSON } from "../lib/store.mjs";

export default handle(async (req) => {
  const body = await readJson(req);
  const method = PAYMENT_METHODS.has(body.method) ? body.method : null;
  if (!method) throw new HttpError(400, "bad_method", "Please choose a payment method.");
  const shipping = validateShipping(body.shipping);
  const q = quote(body.items, shipping);
  const reference = newReference();

  let data;
  try {
    ({ data } = await createOrder(buildCreateOrderBody({ reference, method, q, shipping, origin: siteOrigin(req) }), `create-${reference}`));
  } catch (err) {
    if (err instanceof PayPalError) {
      console.error("[checkout] create order failed", err.message, JSON.stringify(err.body?.details || []));
      throw new HttpError(502, "paypal_create_failed", "PayPal couldn't start this payment. You have not been charged — please try again, or choose another way to pay.");
    }
    throw err;
  }

  const totals = publicTotals(q);
  // Snapshot of what we priced. Capture and webhooks only mark an order paid if it matches this.
  await putJSON(keys.pending(data.id), {
    orderId: data.id,
    reference,
    method,
    totals,
    shipping,
    paypalEnv: paypalEnv(),
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true, orderId: data.id, reference, totals });
});

export const config = { path: "/api/checkout/orders", method: ["POST"] };
