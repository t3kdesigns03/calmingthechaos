// POST /api/paypal/webhook — PayPal webhook receiver.
//
// Every delivery is signature-verified against PAYPAL_WEBHOOK_ID before
// anything is read from it. Unverified deliveries get a 400 and change nothing.
//
// Handled events:
//   PAYMENT.CAPTURE.COMPLETED  → order recorded/confirmed as PAID (ready to fulfill)
//   PAYMENT.CAPTURE.PENDING    → PAYMENT_PENDING (do not ship yet)
//   PAYMENT.CAPTURE.DENIED / .DECLINED → DENIED (do not ship)
//   PAYMENT.CAPTURE.REFUNDED   → REFUNDED or PARTIALLY_REFUNDED
//   PAYMENT.CAPTURE.REVERSED   → REVERSED (chargeback/reversal — do not ship)
// Anything else is acknowledged and ignored.
import { buildRecord, shouldAdvance } from "../lib/orders.mjs";
import { getOrder, verifyWebhook } from "../lib/paypal.mjs";
import { getJSON, keys, ordersStore, putJSON, updateOrder } from "../lib/store.mjs";

const text = (status, msg) => new Response(msg, { status, headers: { "content-type": "text/plain", "cache-control": "no-store" } });

export default async (req) => {
  const raw = await req.text();
  if (raw.length > 200_000) return text(413, "too large");
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return text(400, "bad json");
  }

  let verified;
  try {
    verified = await verifyWebhook(raw, req.headers);
  } catch (err) {
    console.error("[webhook] verification call failed", err?.message || err);
    return text(500, "verification unavailable"); // PayPal will retry
  }
  if (!verified.ok) {
    console.warn("[webhook] rejected unverified delivery", verified.reason, event?.id, event?.event_type);
    return text(400, "signature verification failed");
  }

  const store = ordersStore();
  if (event.id && (await store.get(keys.event(event.id)))) return text(200, "duplicate");

  try {
    await processEvent(event);
  } catch (err) {
    console.error("[webhook] processing failed", event.id, event.event_type, err?.stack || err);
    return text(500, "processing failed"); // not marked processed → PayPal retries
  }
  if (event.id) await store.set(keys.event(event.id), JSON.stringify({ type: event.event_type, at: new Date().toISOString() }));
  return text(200, "ok");
};

async function processEvent(event) {
  const type = event.event_type;
  const r = event.resource || {};
  switch (type) {
    case "PAYMENT.CAPTURE.COMPLETED":
    case "PAYMENT.CAPTURE.PENDING":
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return onCapture(event, r);
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED":
      return onRefundOrReversal(event, r);
    default:
      console.log("[webhook] ignored event type", type);
  }
}

async function onCapture(event, capture) {
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  const pending = orderId ? await getJSON(keys.pending(orderId)) : null;
  if (!pending) return unmatched(event, capture.id, "no order created by this site for this capture");

  await putJSON(keys.capture(capture.id), { orderId });
  let order = null;
  try {
    ({ data: order } = await getOrder(orderId)); // buyer details for the record
  } catch (err) {
    console.warn("[webhook] could not fetch order details", orderId, err?.message);
  }
  const status = event.event_type.endsWith("COMPLETED") ? "COMPLETED" : event.event_type.endsWith("PENDING") ? "PENDING" : "DECLINED";
  const fresh = buildRecord(pending, order, { ...capture, status }, `webhook:${event.event_type}`);
  await updateOrder(orderId, (cur) => {
    if (!cur) return fresh;
    if (!shouldAdvance(cur.status, fresh.status)) {
      return { ...cur, history: [...(cur.history || []), { at: new Date().toISOString(), source: `webhook:${event.event_type}`, note: "confirmed, no status change" }] };
    }
    return { ...cur, ...fresh, buyer: order ? fresh.buyer : cur.buyer, createdAt: cur.createdAt, history: [...(cur.history || []), ...fresh.history] };
  });
}

async function onRefundOrReversal(event, refund) {
  const up = (refund.links || []).find((l) => l.rel === "up" && /\/captures\//.test(l.href || ""));
  const captureId = up ? up.href.split("/captures/")[1].split(/[/?]/)[0] : refund.id;
  const idx = captureId ? await getJSON(keys.capture(captureId)) : null;
  if (!idx) return unmatched(event, captureId || refund.id, "refund/reversal for a capture we have no record of");

  const totalRefunded = refund.seller_payable_breakdown?.total_refunded_amount?.value;
  await updateOrder(idx.orderId, (cur) => {
    if (!cur) return null;
    let status = "REVERSED";
    if (event.event_type.endsWith("REFUNDED")) {
      const full = totalRefunded ? Number(totalRefunded) >= Number(cur.amount?.value || cur.totals?.total) : refund.amount?.value === cur.amount?.value;
      status = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
    }
    const entry = { at: new Date().toISOString(), source: `webhook:${event.event_type}`, refundId: refund.id, amount: refund.amount?.value || null, status };
    if (!shouldAdvance(cur.status, status)) return { ...cur, history: [...(cur.history || []), { ...entry, note: "no status change" }] };
    return { ...cur, status, readyToFulfill: false, history: [...(cur.history || []), entry] };
  });
}

async function unmatched(event, id, why) {
  console.warn("[webhook] unmatched", event.event_type, id, why);
  await putJSON(keys.unmatched(`${event.id || id}`), { eventId: event.id, type: event.event_type, resourceId: id, why, at: new Date().toISOString(), resource: event.resource });
}

export const config = { path: "/api/paypal/webhook", method: ["POST"] };
