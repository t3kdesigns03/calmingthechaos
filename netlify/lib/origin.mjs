// Origin used for PayPal return/cancel URLs. Only our own hosts are allowed.
const ALLOWED = [/^calmingemfchaos\.com$/, /^www\.calmingemfchaos\.com$/, /^ctc\.t3kdesigns\.app$/, /^([a-z0-9-]+--)?calmingthechaos\.netlify\.app$/, /^localhost(:\d+)?$/];

export function siteOrigin(req) {
  try {
    const u = new URL(req.url);
    if (ALLOWED.some((re) => re.test(u.host))) return u.origin;
  } catch {}
  return "https://calmingemfchaos.com";
}
