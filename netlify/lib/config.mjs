// Shared configuration for the checkout functions.
// Secrets come ONLY from environment variables (Netlify UI → Site configuration
// → Environment variables). Nothing secret is ever hardcoded here.

/**
 * FLAT SHIPPING RATE (USD) — charged once per order, regardless of items.
 *
 * PLACEHOLDER: $0.00 until the owner sets the real rate. Change this one
 * number (e.g. "8.95") and redeploy; checkout, PayPal order totals and the
 * Texas tax base all read from it.
 */
export const SHIPPING_FLAT_RATE_USD = "0.00";

/** Max quantity of a single product per order (guards typos like qty 100). */
export const MAX_QTY_PER_ITEM = 20;

export const BRAND_NAME = "Calming The Chaos";

export function env(name) {
  const g = globalThis.Netlify;
  const v = g && g.env && typeof g.env.get === "function" ? g.env.get(name) : process.env[name];
  return typeof v === "string" ? v.trim() : v;
}

/** "sandbox" (default) or "live". Anything else is treated as sandbox. */
export function paypalEnv() {
  return env("PAYPAL_ENV") === "live" ? "live" : "sandbox";
}

export function paypalApiBase() {
  return paypalEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

/**
 * Texas combined sales-tax rate as a decimal (e.g. 0.0825). Returns null when
 * missing or out of range — Texas orders are refused rather than under-taxed.
 */
export function txTaxRate() {
  const raw = env("TX_SALES_TAX_RATE");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 0.0825) return null;
  return n;
}
