// Order storage in Netlify Blobs.
//
// One site-wide store per PayPal environment so sandbox test orders never mix
// with live ones: "ctc-orders-sandbox" / "ctc-orders-live".
//
// Keys:
//   pending/<orderId>   order we created at PayPal (cart, totals, address) — not paid
//   orders/<orderId>    paid (or once-paid) order record used for fulfillment
//   captures/<captureId> → { orderId }   index for refund/reversal webhooks
//   events/<eventId>    processed webhook event ids (dedupe)
//   unmatched/<id>      verified PayPal events we could not tie to one of our orders
import { getStore } from "@netlify/blobs";
import { paypalEnv } from "./config.mjs";

let injected = null;
/** Tests inject an in-memory store with the same get/setJSON/list/getWithMetadata surface. */
export function _setStoreForTests(s) {
  injected = s;
}

export function ordersStore() {
  if (injected) return injected;
  return getStore({ name: `ctc-orders-${paypalEnv()}`, consistency: "strong" });
}

export const keys = {
  pending: (id) => `pending/${id}`,
  order: (id) => `orders/${id}`,
  capture: (id) => `captures/${id}`,
  event: (id) => `events/${id}`,
  unmatched: (id) => `unmatched/${id}`,
};

export async function getJSON(key) {
  return ordersStore().get(key, { type: "json" });
}

export async function putJSON(key, value) {
  return ordersStore().setJSON(key, value);
}

/**
 * Read-modify-write of one order record with an ETag guard, so a capture
 * response and a webhook arriving together can't silently clobber each other.
 * `fn(current|null)` returns the next record (or null to leave it untouched).
 */
export async function updateOrder(orderId, fn) {
  const store = ordersStore();
  const key = keys.order(orderId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await store.getWithMetadata(key, { type: "json" });
    const next = fn(cur ? cur.data : null);
    if (!next) return cur ? cur.data : null;
    next.updatedAt = new Date().toISOString();
    const opts = cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const { modified } = await store.setJSON(key, next, opts);
    if (modified) return next;
  }
  throw new Error(`could not update ${key} after concurrent writes`);
}

export async function listOrders() {
  const store = ordersStore();
  const { blobs } = await store.list({ prefix: "orders/" });
  const out = [];
  for (const b of blobs) {
    const o = await store.get(b.key, { type: "json" });
    if (o) out.push(o);
  }
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function listUnmatched() {
  const store = ordersStore();
  const { blobs } = await store.list({ prefix: "unmatched/" });
  const out = [];
  for (const b of blobs) {
    const o = await store.get(b.key, { type: "json" });
    if (o) out.push(o);
  }
  return out;
}
