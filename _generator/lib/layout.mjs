import { site, nav, byId } from "./data.mjs";
import { plate, icon, svgLib } from "./svg.mjs";

/* depth 0 = root, 1 = /products/ */
export const base = (d) => (d ? "../" : "");
export const asset = (d, p) => base(d) + p;
export const link = (d, p) => base(d) + p;
export const productHref = (d, slug) => base(d) + "products/" + slug + ".html";

export function head({ title, desc, path, depth = 0, schema }) {
  const b = base(depth);
  const canonical = site.url + "/" + path;
  const og = site.url + "/" + "assets/img/og-banner.png";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#071A33">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${og}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${og}">
<link rel="icon" type="image/svg+xml" href="${b}assets/img/mark.svg">
<link rel="icon" type="image/png" href="${b}assets/img/mark-512.png">
<link rel="apple-touch-icon" href="${b}assets/img/mark-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${b}assets/css/styles.css">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ""}
</head>`;
}

export function header(depth = 0, current = "") {
  const b = base(depth);
  const links = nav.map((n) =>
    `<a href="${b}${n.href}"${current === n.href ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("");
  return `<header class="site-header">
  <div class="wrap-wide nav">
    <a class="brand" href="${b}index.html" aria-label="${site.name} — home">
      <img src="${b}assets/img/logo-lockup.png" alt="${site.name} — EMF Protection and Remediation" height="46" width="118">
    </a>
    <nav class="nav-links" aria-label="Primary">
      ${links}
      <a class="btn btn-gold btn-sm" href="${b}shop.html">Shop the Line</a>
    </nav>
    <div class="nav-actions">
      <button class="cart-btn js-open-cart" aria-label="Open selections">
        ${icon.gift}<span class="cart-count" style="display:none">0</span>
      </button>
      <button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;
}

export function footer(depth = 0) {
  const b = base(depth);
  const col = (title, items) =>
    `<div class="foot-col"><h5>${title}</h5>${items.map((i) => `<a href="${b}${i[1]}">${i[0]}</a>`).join("")}</div>`;
  return `<footer class="site-footer">
  <div class="wrap-wide">
    <div class="foot-grid">
      <div class="foot-brand">
        <img src="${b}assets/img/logo-lockup.png" alt="${site.name}" width="200" height="78" loading="lazy">
        <p>Gold-standard tools for a quieter field. Lorelei Shafer helps you choose the right harmony for your home, your devices, and your family.</p>
        <div class="foot-contact" style="margin-top:16px">
          <a href="${site.phoneHref}">${site.phone}</a><br>
          <a href="${site.emailHref}">${site.email}</a>
        </div>
      </div>
      ${col("Shop", [["Whole home", "shop.html#home"], ["Sleep", "shop.html#sleep"], ["On the body", "shop.html#body"], ["Device chips", "shop.html#device"], ["Bundles", "shop.html#bundle"]])}
      ${col("Learn", [["How It Works", "how-it-works.html"], ["Start Here", "start-here.html"], ["FAQ", "faq.html"], ["About Lorelei", "about.html"]])}
      ${col("Connect", [["Contact", "contact.html"], ["Call Lorelei", "contact.html"], ["Legal & Disclaimer", "legal.html"]])}
    </div>
    <p class="foot-disc">Products in this line were originally developed by EMF Solutions and are retailed by Calming The Chaos. These products are intended for general wellness and environmental harmony only. They are not medical devices and are not intended to diagnose, treat, cure, or prevent any disease. They are not FDA approved. Statements describing laboratory or field testing refer to testing reported by the manufacturer and have not been independently verified; individual experiences vary.</p>
    <div class="foot-bottom">
      <span>© <span class="js-year">2026</span> ${site.name}. All rights reserved.</span>
      <span>Made with calm · ${site.phone}</span>
    </div>
  </div>
</footer>`;
}

export function cartDrawer(depth = 0) {
  return `<div class="drawer-scrim js-close-cart" aria-hidden="true"></div>
<aside class="drawer" role="dialog" aria-label="Your selections" aria-modal="true">
  <div class="drawer-head">
    <h3 class="gold-text">Your selections</h3>
    <button class="drawer-close js-close-cart" aria-label="Close">×</button>
  </div>
  <div class="drawer-body"></div>
  <div class="drawer-foot">
    <div class="drawer-total"><span>Estimated total</span><b class="gold-text">$X.XX</b></div>
    <a class="btn btn-gold btn-block" href="${base(depth)}contact.html">Ask Lorelei to finalize</a>
    <p class="drawer-note">Pricing is being finalized. Lorelei will confirm your total and the exact pieces your space needs — no obligation.</p>
  </div>
</aside>
<div class="toast"><span>${icon.check}</span><b>Added</b></div>
${svgLib()}`;
}

export function scripts(depth = 0) {
  return `<script src="${base(depth)}assets/js/app.js" defer></script>`;
}

/* ---------- reusable blocks ---------- */
export function productCard(p, depth = 0) {
  return `<a class="card lift pcard" href="${productHref(depth, p.slug)}" aria-label="${p.name}">
    <div class="plate">${p.tag ? `<span class="tag">${p.tag}</span>` : ""}${plate[p.icon] || plate.box}</div>
    <div class="pbody">
      <h3>${p.name}</h3>
      ${p.subtitle ? `<div class="who-for" style="color:var(--gold-foil);margin-bottom:8px">${p.subtitle}</div>` : ""}
      <p class="job">${p.job}</p>
      <div class="prow">
        <span class="price gold-text"><small>Retail</small>$X.XX</span>
        <span class="btn btn-line btn-sm">View ${icon.arrow}</span>
      </div>
    </div>
  </a>`;
}

export function page(opts, main) {
  const { depth = 0, bodyClass = "" } = opts;
  return `${head(opts)}
<body class="${bodyClass}">
${header(depth, opts.current || "")}
<main id="main">
${main}
</main>
${footer(depth)}
${cartDrawer(depth)}
${scripts(depth)}
</body>
</html>`;
}
