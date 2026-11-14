// Test harness: fake Netlify env, in-memory Blobs store, and a mock PayPal API.
import { _setStoreForTests } from "../netlify/lib/store.mjs";

export const ENV = {
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "test-client-id",
  PAYPAL_CLIENT_SECRET: "test-secret",
  PAYPAL_WEBHOOK_ID: "55355932J82817220",
  ORDERS_ADMIN_TOKEN: "admin-token-0123456789abcdef",
  TX_SALES_TAX_RATE: "0.0825",
};
globalThis.Netlify = { env: { get: (k) => ENV[k] } };

export class MemStore {
  constructor() {
    this.m = new Map();
    this.n = 0;
  }
  async get(key, opts = {}) {
    const e = this.m.get(key);
    if (!e) return null;
    return opts.type === "json" ? JSON.parse(e.v) : e.v;
  }
  async getWithMetadata(key, opts = {}) {
    const e = this.m.get(key);
    if (!e) return null;
    return { data: opts.type === "json" ? JSON.parse(e.v) : e.v, etag: e.etag, metadata: {} };
  }
  async set(key, v, opts = {}) {
    const cur = this.m.get(key);
    if (opts.onlyIfNew && cur) return { modified: false };
    if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
    const etag = `"${++this.n}"`;
    this.m.set(key, { v: String(v), etag });
    return { modified: true, etag };
  }
  async setJSON(key, v, opts) {
    return this.set(key, JSON.stringify(v), opts);
  }
  async list({ prefix = "" } = {}) {
    return { blobs: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: this.m.get(key).etag })), directories: [] };
  }
  keys(prefix = "") {
    return [...this.m.keys()].filter((k) => k.startsWith(prefix));
  }
}

/** Mock of the PayPal REST endpoints the functions call. */
export class MockPayPal {
  constructor() {
    this.orders = new Map();
    this.calls = [];
    this.nextCapture = null; // override: { status, http, issue, amount }
    this.verifyStatus = "SUCCESS";
    this.authResult = null; // card 3DS authentication_result to return on GET order
    this.seq = 0;
  }
  install() {
    globalThis.fetch = async (url, init = {}) => this.handle(String(url), init);
  }
  res(status, body) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "paypal-debug-id": "dbg123" } });
  }
  async handle(url, init) {
    const u = new URL(url);
    if (u.origin !== "https://api-m.sandbox.paypal.com") throw new Error(`unexpected host ${u.origin}`);
    const body = init.body;
    this.calls.push({ method: init.method, path: u.pathname, body, headers: init.headers });
    if (u.pathname === "/v1/oauth2/token") {
      const p = new URLSearchParams(body);
      return this.res(200, { access_token: p.get("response_type") === "client_token" ? "CLIENT_TOKEN" : "ACCESS", expires_in: 32400 });
    }
    if (u.pathname === "/v2/checkout/orders" && init.method === "POST") {
      const req = JSON.parse(body);
      const id = `ORDER${String(++this.seq).padStart(10, "0")}`;
      this.orders.set(id, { id, status: "CREATED", req });
      return this.res(201, { id, status: "CREATED" });
    }
    let m = u.pathname.match(/^\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/);
    if (m) {
      const o = this.orders.get(m[1]);
      if (!o) return this.res(404, { name: "RESOURCE_NOT_FOUND" });
      const nc = this.nextCapture || {};
      if (nc.http) return this.res(nc.http, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: nc.issue }] });
      const pu = o.req.purchase_units[0];
      o.status = "COMPLETED";
      o.capture = { id: `CAP${m[1].slice(-8)}`, status: nc.status || "COMPLETED", amount: { currency_code: "USD", value: nc.amount || pu.amount.value }, create_time: "2026-11-13T20:00:00Z" };
      return this.res(201, this.orderView(o));
    }
    m = u.pathname.match(/^\/v2\/checkout\/orders\/([A-Z0-9]+)$/);
    if (m) {
      const o = this.orders.get(m[1]);
      return o ? this.res(200, this.orderView(o)) : this.res(404, { name: "RESOURCE_NOT_FOUND" });
    }
    if (u.pathname === "/v1/notifications/verify-webhook-signature") {
      JSON.parse(body); // must be valid JSON
      return this.res(200, { verification_status: this.verifyStatus });
    }
    return this.res(404, { name: "NOT_FOUND" });
  }
  orderView(o) {
    const pu = o.req.purchase_units[0];
    const method = Object.keys(o.req.payment_source || { paypal: {} })[0];
    const ps =
      method === "card"
        ? { card: { brand: "VISA", last_digits: "1111", name: "Test Buyer", ...(this.authResult ? { authentication_result: this.authResult } : {}) } }
        : { [method]: { email_address: "buyer@example.com", account_id: "PAYERID1", name: { given_name: "Test", surname: "Buyer" } } };
    return {
      id: o.id,
      status: o.status,
      payment_source: ps,
      payer: { payer_id: "PAYERID1", email_address: "buyer@example.com", name: { given_name: "Test", surname: "Buyer" } },
      purchase_units: [{ ...pu, payments: o.capture ? { captures: [o.capture] } : undefined }],
    };
  }
}

export function fresh() {
  const store = new MemStore();
  _setStoreForTests(store);
  const pp = new MockPayPal();
  pp.install();
  return { store, pp };
}

export const ADDR = { name: "Pat Buyer", email: "pat@example.com", phone: "", line1: "123 Main St", line2: "", city: "Denver", state: "CO", zip: "80202" };
export const TX_ADDR = { ...ADDR, city: "Lubbock", state: "TX", zip: "79424" };

export const post = (path, body, headers = {}) =>
  new Request(`https://deploy-preview-1--calmingthechaos.netlify.app${path}`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers });
export const get = (path, headers = {}) => new Request(`https://deploy-preview-1--calmingthechaos.netlify.app${path}`, { headers });

export async function call(fn, req, params = {}) {
  const res = await fn(req, { params });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}
