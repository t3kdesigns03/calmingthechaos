// Small response helpers. API responses are never cached.

const NO_STORE = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...NO_STORE, ...extraHeaders } });
}

/** Plain-language error for the buyer, plus a machine code for the page. */
export function fail(status, code, message, extra = {}) {
  return json({ ok: false, code, message, ...extra }, status);
}

export async function readJson(req, maxBytes = 20_000) {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "That request was too large.");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new HttpError(400, "bad_json", "We couldn't read that request.");
  }
}

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** Wrap a handler so thrown HttpErrors become JSON and anything else is a generic 500. */
export function handle(fn) {
  return async (req, context) => {
    try {
      return await fn(req, context);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.code, err.message, err.extra);
      console.error("[checkout] unexpected error", err && err.stack ? err.stack : err);
      return fail(500, "server_error", "Something went wrong on our side. Please try again in a moment.");
    }
  };
}
