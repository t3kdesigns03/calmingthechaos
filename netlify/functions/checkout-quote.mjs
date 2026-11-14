// POST /api/checkout/quote — server-priced totals for the cart + ship-to address.
// Body: { items: [{ sku, qty }], shipping: { name, email, phone, line1, line2, city, state, zip } }
import { handle, json, readJson } from "../lib/http.mjs";
import { publicTotals, quote, validateShipping } from "../lib/pricing.mjs";

export default handle(async (req) => {
  const body = await readJson(req);
  const shipping = validateShipping(body.shipping);
  return json({ ok: true, totals: publicTotals(quote(body.items, shipping)) });
});

export const config = { path: "/api/checkout/quote", method: ["POST"] };
