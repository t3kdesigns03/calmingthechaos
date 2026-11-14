// Server-side cart pricing. The browser only sends SKUs + quantities; every
// price, the shipping charge and the tax are computed here from catalog.json.
import catalog from "../../assets/data/catalog.json" with { type: "json" };
import { MAX_QTY_PER_ITEM, SHIPPING_FLAT_RATE_USD, txTaxRate } from "./config.mjs";
import { HttpError } from "./http.mjs";

export const US_STATES = new Set(
  ("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY " +
    "AA AE AP AS GU MP PR VI").split(" ")
);

export const toCents = (usd) => Math.round(Number(usd) * 100);
export const toUsd = (cents) => (cents / 100).toFixed(2);

export function shippingCents() {
  const c = toCents(SHIPPING_FLAT_RATE_USD);
  if (!Number.isInteger(c) || c < 0) throw new Error("SHIPPING_FLAT_RATE_USD is not a valid amount");
  return c;
}

/** Validate [{sku, qty}] → priced lines. Duplicate SKUs are merged. */
export function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, "empty_cart", "Your cart is empty.");
  if (items.length > 50) throw new HttpError(400, "bad_cart", "Your cart has too many lines.");
  const merged = new Map();
  for (const it of items) {
    const sku = typeof it?.sku === "string" ? it.sku : "";
    const qty = Number(it?.qty);
    const p = catalog.products[sku];
    if (!p) throw new HttpError(400, "unknown_item", "One of the items in your cart is no longer available. Please remove it and try again.");
    if (!Number.isInteger(qty) || qty < 1) throw new HttpError(400, "bad_qty", `Please check the quantity for ${p.name}.`);
    merged.set(sku, (merged.get(sku) || 0) + qty);
  }
  const lines = [];
  for (const [sku, qty] of merged) {
    const p = catalog.products[sku];
    if (qty > MAX_QTY_PER_ITEM) throw new HttpError(400, "bad_qty", `The most you can order online is ${MAX_QTY_PER_ITEM} of ${p.name}. Contact Lorelei for larger orders.`);
    lines.push({ sku, name: p.name, qty, unitCents: p.priceCents, lineCents: p.priceCents * qty });
  }
  return lines;
}

const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Validate the shipping/contact form. US addresses only. */
export function validateShipping(raw) {
  const s = {
    name: clean(raw?.name, 300),
    email: clean(raw?.email, 254).toLowerCase(),
    phone: clean(raw?.phone, 30),
    line1: clean(raw?.line1, 300),
    line2: clean(raw?.line2, 300),
    city: clean(raw?.city, 120),
    state: clean(raw?.state, 2).toUpperCase(),
    zip: clean(raw?.zip, 10),
    country: "US",
  };
  const bad = [];
  if (s.name.length < 2) bad.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) bad.push("email");
  if (s.line1.length < 3) bad.push("line1");
  if (s.city.length < 2) bad.push("city");
  if (!US_STATES.has(s.state)) bad.push("state");
  if (!/^\d{5}(-\d{4})?$/.test(s.zip)) bad.push("zip");
  if (bad.length) {
    throw new HttpError(400, "bad_address", "Please check the highlighted shipping details.", { fields: bad });
  }
  return s;
}

/** Full order math. Texas ship-to addresses are charged TX sales tax on items + shipping. */
export function quote(items, shipping) {
  const lines = priceItems(items);
  const itemsCents = lines.reduce((n, l) => n + l.lineCents, 0);
  const shipCents = shippingCents();
  let taxCents = 0;
  let taxRate = 0;
  if (shipping.state === "TX") {
    taxRate = txTaxRate();
    if (taxRate === null) {
      console.error("[checkout] TX_SALES_TAX_RATE missing or invalid — refusing Texas order");
      throw new HttpError(503, "tax_unavailable", "We can't take Texas orders online at the moment. Please contact Lorelei to order.");
    }
    taxCents = Math.round((itemsCents + shipCents) * taxRate);
  }
  const totalCents = itemsCents + shipCents + taxCents;
  return { lines, itemsCents, shipCents, taxCents, taxRate, totalCents };
}

export function publicTotals(q) {
  return {
    items: q.lines.map((l) => ({ sku: l.sku, name: l.name, qty: l.qty, unit: toUsd(l.unitCents), line: toUsd(l.lineCents) })),
    subtotal: toUsd(q.itemsCents),
    shipping: toUsd(q.shipCents),
    tax: toUsd(q.taxCents),
    taxRate: q.taxRate,
    total: toUsd(q.totalCents),
    currency: "USD",
  };
}
