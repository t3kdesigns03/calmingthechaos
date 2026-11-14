// Minimal PayPal REST client (Orders v2 + webhook verification).
// Credentials: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from env only.
import { env, paypalApiBase } from "./config.mjs";

let tokenCache = null; // { token, exp, base }

export class PayPalError extends Error {
  constructor(status, body, debugId) {
    const issue = body?.details?.[0]?.issue || body?.name || `HTTP_${status}`;
    super(`PayPal ${status} ${issue}${debugId ? ` (debug_id ${debugId})` : ""}`);
    this.status = status;
    this.body = body;
    this.issue = issue;
    this.debugId = debugId;
  }
}

function credentials() {
  const id = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function oauth(params) {
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { authorization: credentials(), "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new PayPalError(res.status, body, res.headers.get("paypal-debug-id"));
  return body;
}

export async function accessToken() {
  const base = paypalApiBase();
  if (tokenCache && tokenCache.base === base && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const body = await oauth({ grant_type: "client_credentials" });
  tokenCache = { token: body.access_token, exp: Date.now() + (Number(body.expires_in) || 300) * 1000, base };
  return tokenCache.token;
}

/** Browser-safe client token for the v6 Web SDK (createInstance({ clientToken })). */
export async function browserClientToken() {
  const body = await oauth({ grant_type: "client_credentials", response_type: "client_token", intent: "sdk_init" });
  return { clientToken: body.access_token, expiresIn: Number(body.expires_in) || 900 };
}

export async function api(method, path, { body, rawBody, headers = {} } = {}) {
  const res = await fetch(`${paypalApiBase()}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      "content-type": "application/json",
      accept: "application/json",
      ...headers,
    },
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  const debugId = res.headers.get("paypal-debug-id");
  if (!res.ok) throw new PayPalError(res.status, data, debugId);
  return { data, debugId };
}

export const createOrder = (payload, requestId) =>
  api("POST", "/v2/checkout/orders", {
    body: payload,
    headers: { "PayPal-Request-Id": requestId, Prefer: "return=representation" },
  });

export const getOrder = (orderId) => api("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);

export const captureOrder = (orderId) =>
  api("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    rawBody: "{}",
    headers: { "PayPal-Request-Id": `capture-${orderId}`, Prefer: "return=representation" },
  });

/**
 * Verify a webhook delivery with PayPal's verify-webhook-signature API.
 * The raw request body is spliced in unchanged so re-serialising the JSON can
 * never alter what PayPal checks. Returns true only for verification_status
 * SUCCESS against our PAYPAL_WEBHOOK_ID.
 */
export async function verifyWebhook(rawBody, headers) {
  const webhookId = env("PAYPAL_WEBHOOK_ID");
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID is not set");
  const h = (n) => headers.get(n);
  const fields = {
    auth_algo: h("paypal-auth-algo"),
    cert_url: h("paypal-cert-url"),
    transmission_id: h("paypal-transmission-id"),
    transmission_sig: h("paypal-transmission-sig"),
    transmission_time: h("paypal-transmission-time"),
  };
  if (Object.values(fields).some((v) => !v)) return { ok: false, reason: "missing PayPal signature headers" };
  const head = JSON.stringify({ ...fields, webhook_id: webhookId });
  const payload = `${head.slice(0, -1)},"webhook_event":${rawBody}}`;
  const { data } = await api("POST", "/v1/notifications/verify-webhook-signature", { rawBody: payload });
  return { ok: data.verification_status === "SUCCESS", reason: data.verification_status };
}
