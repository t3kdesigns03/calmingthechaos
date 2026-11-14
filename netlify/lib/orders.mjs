// Builds PayPal order payloads and the stored fulfillment record.
import { randomBytes } from "node:crypto";
import { BRAND_NAME } from "./config.mjs";
import { toUsd } from "./pricing.mjs";

export const PAYMENT_METHODS = new Set(["paypal", "venmo", "card", "guest"]);

/** Human-friendly order reference, e.g. CTC-261113-7KQ2M9. */
export function newReference(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rnd = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");
  return `CTC-${d}-${rnd}`;
}

const trim = (s, n) => String(s || "").slice(0, n);

/**
 * PayPal Orders v2 create body. The buyer's shipping address (collected on our
 * page) is sent with SET_PROVIDED_ADDRESS so every payment method ships to the
 * same validated address and the Texas tax we charged matches the destination.
 */
export function buildCreateOrderBody({ reference, method, q, shipping, origin }) {
  const address = {
    address_line_1: trim(shipping.line1, 300),
    ...(shipping.line2 ? { address_line_2: trim(shipping.line2, 300) } : {}),
    admin_area_2: trim(shipping.city, 120),
    admin_area_1: shipping.state,
    postal_code: shipping.zip,
    country_code: "US",
  };
  const unit = {
    reference_id: "default",
    custom_id: reference,
    invoice_id: reference,
    description: `${BRAND_NAME} order ${reference}`,
    amount: {
      currency_code: "USD",
      value: toUsd(q.totalCents),
      breakdown: {
        item_total: { currency_code: "USD", value: toUsd(q.itemsCents) },
        shipping: { currency_code: "USD", value: toUsd(q.shipCents) },
        tax_total: { currency_code: "USD", value: toUsd(q.taxCents) },
      },
    },
    items: q.lines.map((l) => ({
      name: trim(l.name, 127),
      sku: trim(l.sku, 127),
      quantity: String(l.qty),
      unit_amount: { currency_code: "USD", value: toUsd(l.unitCents) },
      category: "PHYSICAL_GOODS",
    })),
    shipping: { type: "SHIPPING", name: { full_name: trim(shipping.name, 300) }, address },
  };

  const body = { intent: "CAPTURE", purchase_units: [unit] };
  const experience = {
    brand_name: BRAND_NAME,
    shipping_preference: "SET_PROVIDED_ADDRESS",
    user_action: "PAY_NOW",
    return_url: `${origin}/checkout.html?paypal=return`,
    cancel_url: `${origin}/checkout.html?paypal=cancel`,
  };
  if (method === "paypal") {
    body.payment_source = { paypal: { email_address: shipping.email, experience_context: { ...experience, landing_page: "LOGIN" } } };
  } else if (method === "venmo") {
    body.payment_source = {
      venmo: { email_address: shipping.email, experience_context: { brand_name: BRAND_NAME, shipping_preference: "SET_PROVIDED_ADDRESS" } },
    };
  } else if (method === "card") {
    // Card fields: PayPal-hosted inputs attach the card; 3-D Secure runs only when the issuer/regulation requires it.
    body.payment_source = {
      card: { attributes: { verification: { method: "SCA_WHEN_REQUIRED" } }, experience_context: { return_url: experience.return_url, cancel_url: experience.cancel_url } },
    };
  } else {
    // "guest" = PayPal's Debit or Credit Card button (PayPal-hosted guest card form).
    body.application_context = { brand_name: BRAND_NAME, shipping_preference: "SET_PROVIDED_ADDRESS", user_action: "PAY_NOW" };
  }
  return body;
}

/** Pull the first capture out of an order/capture response. */
export function firstCapture(order) {
  const pu = order?.purchase_units?.[0];
  return pu?.payments?.captures?.[0] || null;
}

/** Who paid and how, from the captured PayPal order (no card numbers — PayPal only returns brand + last 4). */
export function payerFromOrder(order) {
  const ps = order?.payment_source || {};
  const method = Object.keys(ps)[0] || "unknown";
  const src = ps[method] || {};
  const name = src.name && typeof src.name === "object" ? [src.name.given_name, src.name.surname].filter(Boolean).join(" ") : src.name || "";
  const payer = order?.payer || {};
  return {
    paymentMethod: method,
    name: name || [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(" ") || null,
    email: src.email_address || payer.email_address || null,
    paypalPayerId: payer.payer_id || src.account_id || null,
    venmoUser: method === "venmo" ? src.user_name || null : null,
    card: method === "card" ? { brand: src.brand || null, last4: src.last_digits || null } : null,
  };
}

/** Map a PayPal capture status onto our fulfillment status. */
export function statusForCapture(captureStatus) {
  switch (captureStatus) {
    case "COMPLETED":
      return "PAID";
    case "PENDING":
      return "PAYMENT_PENDING";
    case "REFUNDED":
      return "REFUNDED";
    case "PARTIALLY_REFUNDED":
      return "PARTIALLY_REFUNDED";
    case "DECLINED":
    case "FAILED":
      return "DENIED";
    default:
      return "NEEDS_REVIEW";
  }
}

/** Fulfillment record. `pending` is what we stored at create time (trusted); `order` is PayPal's captured order. */
export function buildRecord(pending, order, capture, source) {
  const amountOk = capture?.amount?.currency_code === "USD" && capture?.amount?.value === pending.totals.total;
  let status = statusForCapture(capture?.status);
  if (status === "PAID" && !amountOk) status = "NEEDS_REVIEW";
  const now = new Date().toISOString();
  return {
    orderId: pending.orderId,
    reference: pending.reference,
    status,
    readyToFulfill: status === "PAID",
    captureId: capture?.id || null,
    captureStatus: capture?.status || null,
    amount: { value: capture?.amount?.value || null, currency: capture?.amount?.currency_code || null, expected: pending.totals.total },
    totals: pending.totals,
    items: pending.totals.items,
    shipping: pending.shipping,
    buyer: { ...payerFromOrder(order), contactEmail: pending.shipping.email, phone: pending.shipping.phone || null },
    paymentMethodRequested: pending.method,
    paypalEnv: pending.paypalEnv,
    createdAt: pending.createdAt,
    paidAt: status === "PAID" ? capture?.create_time || now : null,
    history: [{ at: now, source, captureStatus: capture?.status || null, status }],
  };
}

/** Status precedence so a late/duplicate event can't move an order backwards (e.g. REFUNDED → PAID). */
const RANK = { NEEDS_REVIEW: 0, PAYMENT_PENDING: 1, DENIED: 2, PAID: 3, PARTIALLY_REFUNDED: 4, REFUNDED: 5, REVERSED: 6 };
export function shouldAdvance(from, to) {
  if (!from) return true;
  if (from === to) return false;
  if (from === "NEEDS_REVIEW") return true;
  return (RANK[to] ?? -1) > (RANK[from] ?? -1);
}
