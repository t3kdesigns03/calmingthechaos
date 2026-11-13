// POST /api/checkout/orders/:orderId/capture — the SERVER captures the payment.
// The browser's "approved" callback is never treated as proof of payment: we
// only report success after PayPal's capture API returns a COMPLETED capture
// whose amount matches the total we priced when the order was created.
import { HttpError, handle, json } from "../lib/http.mjs";
import { buildRecord, firstCapture, shouldAdvance } from "../lib/orders.mjs";
import { PayPalError, captureOrder, getOrder } from "../lib/paypal.mjs";
import { getJSON, keys, putJSON, updateOrder } from "../lib/store.mjs";

const DECLINE_ISSUES = new Set(["INSTRUMENT_DECLINED", "TRANSACTION_REFUSED", "CARD_EXPIRED", "PAYER_CANNOT_PAY", "CARD_CLOSED", "DECLINED_DUE_TO_RELATED_TXN"]);

// Buyer-facing payment outcomes (declined, not verified, not finished) are
// normal results, not transport errors: they return HTTP 200 with ok:false so
// the browser console stays clean and the page shows the message.
const outcome = (code, message, extra = {}) => json({ ok: false, code, message, ...extra });

const DECLINED_MSG = "Your payment was declined, so you have not been charged. Please try a different card or payment method.";

/** Card 3-D Secure outcome check (runs before capture). Returns an error message or null to proceed. */
function threeDSProblem(order) {
  const auth = order?.payment_source?.card?.authentication_result;
  if (!auth) return null; // 3DS not required for this card
  const shift = auth.liability_shift;
  const status = auth.three_d_secure?.authentication_status;
  if (shift === "YES" || shift === "POSSIBLE") return null;
  if (shift === "NO" && ["N", "R"].includes(status)) return "Your bank couldn't verify this card, so you have not been charged. Please try again or use a different card.";
  if (shift === "UNKNOWN") return "We couldn't verify this card with your bank, so you have not been charged. Please try again.";
  return null; // NO with not-enrolled / unavailable / bypassed: allowed per PayPal guidance
}

export default handle(async (req, context) => {
  const orderId = String(context.params?.orderId || "");
  if (!/^[A-Z0-9]{8,30}$/.test(orderId)) throw new HttpError(400, "bad_order", "We couldn't find that order.");

  const pending = await getJSON(keys.pending(orderId));
  if (!pending) throw new HttpError(404, "unknown_order", "We couldn't find that order. You have not been charged.");

  // Already captured (double click, retry, or webhook got there first)?
  const existing = await getJSON(keys.order(orderId));
  if (existing && ["PAID", "PAYMENT_PENDING"].includes(existing.status)) return json(publicResult(existing));

  if (pending.method === "card") {
    const { data: before } = await getOrder(orderId);
    const problem = threeDSProblem(before);
    if (problem) {
      await putJSON(keys.pending(orderId), { ...pending, lastAttempt: { at: new Date().toISOString(), result: "3ds_rejected" } });
      return outcome("card_not_verified", problem, { recoverable: true });
    }
  }

  let order;
  try {
    ({ data: order } = await captureOrder(orderId));
  } catch (err) {
    if (!(err instanceof PayPalError)) throw err;
    console.error("[checkout] capture failed", orderId, err.message, JSON.stringify(err.body?.details || []));
    if (DECLINE_ISSUES.has(err.issue)) {
      await putJSON(keys.pending(orderId), { ...pending, lastAttempt: { at: new Date().toISOString(), result: err.issue } });
      return outcome("declined", DECLINED_MSG, { recoverable: err.issue === "INSTRUMENT_DECLINED" });
    }
    if (err.issue === "ORDER_NOT_APPROVED" || err.issue === "PAYER_ACTION_REQUIRED") {
      return outcome("not_approved", "The payment wasn't finished, so you have not been charged. Please try again.");
    }
    // ORDER_ALREADY_CAPTURED, timeouts, 5xx: ask PayPal what actually happened before answering.
    try {
      ({ data: order } = await getOrder(orderId));
    } catch {
      order = null;
    }
    if (!firstCapture(order)) {
      throw new HttpError(502, "capture_failed", "We couldn't complete the payment with PayPal, and you have not been charged. Please try again.");
    }
  }

  const capture = firstCapture(order);
  if (!capture || ["DECLINED", "FAILED"].includes(capture.status)) {
    await putJSON(keys.pending(orderId), { ...pending, lastAttempt: { at: new Date().toISOString(), result: capture?.status || "NO_CAPTURE" } });
    return outcome("declined", DECLINED_MSG, { recoverable: true });
  }

  await putJSON(keys.capture(capture.id), { orderId });
  const fresh = buildRecord(pending, order, capture, "capture-api");
  const saved = await updateOrder(orderId, (cur) => {
    if (!cur) return fresh;
    if (!shouldAdvance(cur.status, fresh.status)) return null;
    return { ...cur, ...fresh, createdAt: cur.createdAt, history: [...(cur.history || []), ...fresh.history] };
  });
  const result = saved || fresh;
  if (result.status === "NEEDS_REVIEW") {
    console.error("[checkout] captured amount mismatch", orderId, capture.amount, pending.totals.total);
  }
  return json(publicResult(result));
});

function publicResult(r) {
  const messages = {
    PAID: "Payment received — thank you!",
    PAYMENT_PENDING: "PayPal is still processing your payment. Lorelei will ship as soon as it clears.",
    NEEDS_REVIEW: "Payment received. Lorelei will confirm your order by email shortly.",
  };
  return {
    ok: true,
    status: r.status,
    message: messages[r.status] || "Thank you — your order was received.",
    orderId: r.orderId,
    reference: r.reference,
    total: r.totals?.total,
    email: r.shipping?.email,
  };
}

export const config = { path: "/api/checkout/orders/:orderId/capture", method: ["POST"] };
