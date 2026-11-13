// GET /api/admin/orders            → stored orders, newest first (?status=PAID to filter)
// GET /api/admin/orders/:orderId   → one order
//
// Gated by ORDERS_ADMIN_TOKEN. Send it as a header (preferred):
//   Authorization: Bearer <token>    or    X-Admin-Token: <token>
// or as ?token=<token> (handy in a browser, but it lands in history/logs).
// An empty, missing or short token is always refused.
import { createHash, timingSafeEqual } from "node:crypto";
import { env, paypalEnv } from "../lib/config.mjs";
import { fail, handle, json } from "../lib/http.mjs";
import { getJSON, keys, listOrders, listUnmatched } from "../lib/store.mjs";

const digest = (s) => createHash("sha256").update(String(s)).digest();

function authorized(req) {
  const expected = env("ORDERS_ADMIN_TOKEN");
  if (!expected || expected.length < 16) return { ok: false, disabled: true };
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const given = (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "") || req.headers.get("x-admin-token") || url.searchParams.get("token") || "";
  if (!given.trim()) return { ok: false };
  return { ok: timingSafeEqual(digest(given.trim()), digest(expected)) };
}

export default handle(async (req, context) => {
  const a = authorized(req);
  if (a.disabled) return fail(503, "admin_disabled", "Admin access is not configured.");
  if (!a.ok) return fail(401, "unauthorized", "Unauthorized.");

  const orderId = context.params?.orderId;
  if (orderId) {
    const order = /^[A-Z0-9]{8,30}$/.test(orderId) ? await getJSON(keys.order(orderId)) : null;
    return order ? json({ ok: true, order }) : fail(404, "not_found", "No stored order with that id.");
  }
  const status = new URL(req.url).searchParams.get("status");
  let orders = await listOrders();
  if (status) orders = orders.filter((o) => o.status === status.toUpperCase());
  return json({ ok: true, env: paypalEnv(), count: orders.length, orders, unmatchedEvents: await listUnmatched() });
});

export const config = { path: ["/api/admin/orders", "/api/admin/orders/:orderId"], method: ["GET"] };
