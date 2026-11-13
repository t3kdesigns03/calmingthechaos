// GET /api/paypal/client-token — browser-safe token for the PayPal v6 Web SDK.
import { paypalEnv } from "../lib/config.mjs";
import { handle, json } from "../lib/http.mjs";
import { browserClientToken } from "../lib/paypal.mjs";

export default handle(async () => {
  const { clientToken, expiresIn } = await browserClientToken();
  return json({ ok: true, clientToken, expiresIn, env: paypalEnv() });
});

export const config = { path: "/api/paypal/client-token", method: ["GET"] };
