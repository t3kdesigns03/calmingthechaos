import { mkdirSync, writeFileSync, cpSync } from "node:fs";
import { site, nav, collections, products, byId, testimonials, faqs, disclaimerFull, disclaimerShort } from "./lib/data.mjs";
import { plate, icon } from "./lib/svg.mjs";
import { page, productCard, productHref, base } from "./lib/layout.mjs";

const OUT = new URL("../site/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
mkdirSync(OUT + "products/", { recursive: true });

const write = (rel, html) => { writeFileSync(OUT + rel, html); };

/* ---------- shared blocks ---------- */
const collProducts = (id) => products.filter((p) => p.collection === id);

function ctaBand(depth) {
  return `<section class="section"><div class="wrap"><div class="cta-band" data-reveal>
    <div class="eyebrow mx-auto">Not sure where to begin?</div>
    <h2 style="max-width:16ch;margin-inline:auto">Let Lorelei build the right stack with you.</h2>
    <p class="lead measure mx-auto">Tell her about your space — a house, an apartment, a car, a child’s wrist — and she’ll help you choose only what you need. No pressure, no upsell.</p>
    <div class="btn-row" style="justify-content:center;margin-top:26px">
      <a class="btn btn-gold" href="${base(depth)}contact.html">${icon.call} Ask Lorelei</a>
      <a class="btn btn-ghost" href="${base(depth)}start-here.html">Find my setup ${icon.arrow}</a>
    </div>
  </div></div></section>`;
}

const localBiz = {
  "@context": "https://schema.org", "@type": "LocalBusiness",
  name: site.name, description: "EMF protection and remediation — a curated wellness line retailed by Lorelei Shafer.",
  telephone: "+19728387600", email: site.email, image: site.url + "/assets/img/og-banner.png",
  url: site.url, slogan: "Gold-standard tools for a quieter field.",
  areaServed: "US", priceRange: "$$",
};

/* ============================================================
   HOME
   ============================================================ */
function home() {
  const featured = ["home-bundle", "better-zzzs", "cell-chip-ultra", "emf-band"].map((s) => byId[s]);
  const main = `
<section class="hero">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap-wide">
    <div class="hero-grid">
      <div data-reveal>
        <div class="eyebrow">EMF Protection &amp; Remediation</div>
        <h1>Make the room <span class="gold-text">feel like itself</span> again.</h1>
        <p class="lead">Harmony for the invisible weather in your home. Hand-finished pieces that bring calm to the wireless and electrical environment around you — while your devices keep working exactly as they do now.</p>
        <div class="btn-row" style="margin-top:30px">
          <a class="btn btn-gold" href="shop.html">Shop the Line ${icon.arrow}</a>
          <a class="btn btn-ghost" href="contact.html">${icon.call} Ask Lorelei</a>
        </div>
        <div class="hero-badges">
          <span><i></i> Harmonize, not shield</span>
          <span><i></i> Upgraded for the fiber era</span>
          <span><i></i> Guided by a real person</span>
        </div>
      </div>
      <div class="hero-logo" data-reveal>
        <div class="hero-orb">
          <div class="halo"></div>
          <div class="ring r1"></div><div class="ring r2"></div>
          <img src="assets/img/logo-lockup.png" alt="Calming The Chaos — luminous gold and cyan emblem" width="520" height="203" fetchpriority="high">
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section bg-ice field">
  <div class="grain"></div>
  <div class="wrap center" style="margin-bottom:52px" data-reveal>
    <div class="eyebrow mx-auto">The invisible weather</div>
    <h2>Three steps from chaos to calm</h2>
    <p class="lead measure mx-auto">Modern life fills our homes with signal — phones, Wi-Fi, routers, smart meters, towers, 5G and Starlink-class sources, and new fiber lines. Here’s how the line approaches it.</p>
  </div>
  <div class="wrap grid g-3 steps">
    ${[
      ["Environment", "Everyday wireless and electrical sources fill the space around you with constant activity — indoors and from the neighborhood beyond your walls.", icon.wave],
      ["Chaos", "EMF Solutions describes this as “subatomic chaos” in the field around us — the restless quality of a space that’s always switched on.", icon.bolt],
      ["Harmony", "Their hand-finished pieces are made to harmonize that field using proprietary natural materials — bringing the space back toward calm, without blocking your signal.", icon.leaf],
    ].map(([t, d, ic], i) => `<div class="card" data-reveal>
      <div class="n">0${i + 1}</div><div class="ic" style="margin-bottom:14px;color:var(--baby-blue-deep)">${ic}</div>
      <h3>${t}</h3><p style="margin:0;color:#496880">${d}</p></div>`).join("")}
  </div>
</section>

<section class="section bg-navy field">
  <div class="wrap">
    <div class="coll-head" data-reveal>
      <div><div class="eyebrow">Featured</div><h2 class="mb-0">Where most people begin</h2></div>
      <a class="btn btn-line btn-sm" href="shop.html">See the full line ${icon.arrow}</a>
    </div>
    <div class="grid g-4">
      ${featured.map((p) => productCard(p, 0)).join("")}
    </div>
  </div>
</section>

<section class="section bg-deep field">
  <div class="wrap">
    <div class="grid g-2" style="align-items:center;gap:clamp(28px,5vw,64px)">
      <div data-reveal>
        <div class="eyebrow">How Lorelei helps</div>
        <h2>A guide, not a checkout line.</h2>
        <p class="lead">Every home is different. A metal roof, a nearby tower, an apartment where you can’t reach the panel, a child who won’t keep a band on — these details matter, and they change what you actually need.</p>
        <p>Lorelei Shafer walks you through it personally. You tell her about your space and what’s on your mind; she helps you choose the smallest set of pieces that will do the most — and tells you honestly what you can skip.</p>
        <div class="btn-row" style="margin-top:24px">
          <a class="btn btn-gold" href="start-here.html">Find my setup ${icon.arrow}</a>
          <a class="btn btn-ghost" href="about.html">Meet Lorelei</a>
        </div>
      </div>
      <div class="grid" style="gap:16px" data-reveal>
        ${[
          [icon.building, "For a whole home", "Start with the building itself, then layer in the rooms and devices you use most."],
          [icon.moon, "For better rest", "Give the bedroom the calmest field in the house — the place you spend a third of your life."],
          [icon.phone, "For the devices you hold", "The right chip for your exact phone, laptop, router, and car."],
          [icon.heart, "For the whole family", "Bands sized for small wrists; a card for the bag; pieces everyone can share."],
        ].map(([ic, h, p]) => `<div class="card feat"><div class="ic">${ic}</div><div><h4>${h}</h4><p>${p}</p></div></div>`).join("")}
      </div>
    </div>
  </div>
</section>

<section class="section bg-ice field">
  <div class="grain"></div>
  <div class="wrap center" style="margin-bottom:44px" data-reveal>
    <div class="eyebrow mx-auto">In their words</div>
    <h2>Calmer rooms, in real homes</h2>
    <p class="lead measure mx-auto">Personal impressions of comfort, sleep, and the feeling of a space — not medical results.</p>
  </div>
  <div class="wrap grid g-2">
    ${testimonials.map((t) => `<div class="card quote" data-reveal>
      <span class="mark">“</span><p>${t.text}</p><div class="who">${t.who} · ${t.where}</div></div>`).join("")}
  </div>
</section>

${ctaBand(0)}

<section class="section-tight bg-deep">
  <div class="wrap center">
    <p class="tiny measure mx-auto">${disclaimerShort}</p>
  </div>
</section>
`;
  return page({
    title: "Calming The Chaos — EMF Protection & Remediation | Lorelei Shafer",
    desc: "Hand-finished EMF harmonizing pieces for your home, sleep, body, devices, and car. Harmonize the invisible weather in your space — guided personally by Lorelei Shafer.",
    path: "index.html", depth: 0, bodyClass: "has-mcta", current: "",
    schema: localBiz,
  }, main + mobileCta(0));
}

function mobileCta(depth) {
  return `<div class="mobile-cta"><a class="btn btn-gold" href="${base(depth)}shop.html">Shop the Line</a><a class="btn btn-ghost" href="${base(depth)}contact.html">Ask Lorelei</a></div>`;
}

/* ============================================================
   SHOP
   ============================================================ */
function shop() {
  const sections = collections.map((c) => {
    const items = collProducts(c.id);
    return `<section class="section${c.id === "sleep" || c.id === "car" ? " bg-ice field" : " bg-navy field"}" id="${c.id}">
      ${c.id === "sleep" || c.id === "car" ? '<div class="grain"></div>' : ""}
      <div class="wrap">
        <div class="coll-head" data-reveal>
          <div>
            <span class="num">${c.num}</span>
            <div class="eyebrow" style="margin:8px 0 6px">${c.eyebrow}</div>
            <h2 class="mb-0">${c.title}</h2>
            <p class="lead measure" style="margin-top:10px">${c.blurb}</p>
          </div>
        </div>
        <div class="grid ${items.length >= 3 ? "g-3" : "g-2"}">
          ${items.map((p) => productCard(p, 0)).join("")}
        </div>
      </div>
    </section>`;
  }).join("");

  const main = `
<section class="hero" style="min-height:auto;padding-block:clamp(70px,11vw,120px)">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap center" data-reveal>
    <div class="eyebrow mx-auto">The full line</div>
    <h1>Shop the <span class="gold-text">Calming The Chaos</span> collection</h1>
    <p class="lead measure mx-auto">Organized the way you’d actually set up a home — start with the whole space, then move to sleep, your body, your devices, and the car. Prices shown as $X.XX are being finalized; Lorelei confirms your total.</p>
    <div class="badge-row" style="justify-content:center;margin-top:22px">
      ${collections.map((c) => `<a class="mini-badge" href="#${c.id}">${c.eyebrow}</a>`).join("")}
    </div>
  </div>
</section>
${sections}
${ctaBand(0)}
`;
  return page({
    title: "Shop — Calming The Chaos EMF Harmonizers, Bands & Device Chips",
    desc: "The complete line: Home & Room Harmonizers, Better ZZZ’s, EMF Bands, phone & laptop chips, Car Harmonizer, upgrades, and starter bundles. Guided by Lorelei Shafer.",
    path: "shop.html", depth: 0, current: "shop.html",
    schema: {
      "@context": "https://schema.org", "@type": "CollectionPage", name: "Shop — Calming The Chaos",
      about: "EMF harmonizing products for home, sleep, body, devices and car.",
    },
  }, main);
}

/* ============================================================
   PRODUCT DETAIL
   ============================================================ */
function productPage(p) {
  const coll = collections.find((c) => c.id === p.collection);
  const pairs = (p.pairs || []).map((s) => byId[s]).filter(Boolean);
  const includes = (p.includes || []).map((s) => byId[s]).filter(Boolean);
  const productSchema = {
    "@context": "https://schema.org", "@type": "Product",
    name: p.name, description: p.seo,
    brand: { "@type": "Brand", name: "EMF Solutions" },
    category: coll ? coll.eyebrow : "EMF harmonizer",
    image: site.url + "/assets/img/og-banner.png",
    offers: { "@type": "Offer", priceCurrency: "USD", availability: "https://schema.org/InStock", seller: { "@type": "Organization", name: site.name }, url: site.url + "/products/" + p.slug + ".html" },
  };
  const main = `
<section class="section" style="padding-top:clamp(30px,5vw,48px)">
  <div class="wrap-wide">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a> / <a href="../shop.html">Shop</a> / <a href="../shop.html#${p.collection}">${coll ? coll.eyebrow : "Products"}</a> / <span>${p.name}</span>
    </nav>
    <div class="pd">
      <div class="pd-media" data-reveal>
        <div class="glow"></div>
        ${plate[p.icon] || plate.box}
      </div>
      <div data-reveal>
        <div class="who-for">${coll ? coll.eyebrow : ""}</div>
        <h1>${p.name}</h1>
        <p class="lead" style="color:var(--gold-foil);margin-bottom:6px">${p.subtitle || ""}</p>
        <div class="price gold-text">$X.XX <small style="font-size:.5em;letter-spacing:.14em;color:var(--muted);font-family:var(--font-body)">— retail pricing to be confirmed by Lorelei</small></div>
        <p class="lead" style="margin-top:16px">${p.job}</p>
        <p>${p.intro}</p>
        ${p.warn ? `<div class="pill" style="border-color:var(--gold);color:var(--gold-bright);align-items:flex-start;line-height:1.5;padding:12px 16px">${icon.sparkle}<span>${p.warn}</span></div>` : ""}
        <div class="btn-row" style="margin:24px 0 6px">
          <button class="btn btn-gold js-add" data-name="${p.name}" data-icon="${p.icon}">${icon.gift} Add to selections</button>
          <a class="btn btn-ghost" href="../contact.html">${icon.call} Ask what I need</a>
        </div>

        <div class="acc" style="margin-top:26px">
          <details open><summary>Who it’s for <span class="pm"></span></summary>
            <div class="acc-body"><p style="margin:0">${p.whoFor}</p></div></details>
          <details><summary>How to place it <span class="pm"></span></summary>
            <div class="acc-body"><ul>${(p.place || []).map((s) => `<li>${s}</li>`).join("")}</ul></div></details>
          ${p.coverage ? `<details><summary>Coverage <span class="pm"></span></summary><div class="acc-body"><p style="margin:0">${p.coverage}${p.dims ? " · " + p.dims : ""}</p></div></details>` : ""}
          ${p.challenges ? `<details><summary>Bigger or harder spaces <span class="pm"></span></summary><div class="acc-body"><p style="margin:0">${p.challenges}</p></div></details>` : ""}
          ${includes.length ? `<details open><summary>What’s inside this bundle <span class="pm"></span></summary><div class="acc-body"><ul>${includes.map((i) => `<li><a href="${i.slug}.html" style="color:var(--cyan-glow)">${i.name}</a> — ${i.job}</li>`).join("")}</ul></div></details>` : ""}
        </div>

        ${pairs.length ? `<div style="margin-top:22px"><h4 style="margin-bottom:10px">Pairs beautifully with</h4><div class="pill-list">${pairs.map((i) => `<a class="pill" href="${i.slug}.html">${icon.check} ${i.name}</a>`).join("")}</div></div>` : ""}

        <p class="disclaimer-sm">${disclaimerShort}</p>
      </div>
    </div>
  </div>
</section>

<section class="section bg-deep field">
  <div class="wrap">
    <div class="coll-head" data-reveal><div><div class="eyebrow">Keep building</div><h2 class="mb-0">More from ${coll ? coll.eyebrow.toLowerCase() : "the line"}</h2></div>
      <a class="btn btn-line btn-sm" href="../shop.html">Full line ${icon.arrow}</a></div>
    <div class="grid g-3">
      ${collProducts(p.collection).filter((x) => x.slug !== p.slug).slice(0, 3).map((x) => productCard(x, 1)).join("")
        || collProducts("home").slice(0, 3).map((x) => productCard(x, 1)).join("")}
    </div>
  </div>
</section>
${ctaBand(1)}
`;
  return page({
    title: `${p.name}${p.subtitle ? " — " + p.subtitle : ""} | Calming The Chaos`,
    desc: p.seo, path: "products/" + p.slug + ".html", depth: 1, current: "shop.html",
    schema: productSchema,
  }, main);
}

/* ============================================================
   HOW IT WORKS
   ============================================================ */
function howItWorks() {
  const main = `
<section class="hero" style="min-height:auto;padding-block:clamp(70px,11vw,120px)">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap center" data-reveal>
    <div class="eyebrow mx-auto">The idea, in plain language</div>
    <h1>Harmony for the <span class="gold-text">invisible weather</span></h1>
    <p class="lead measure mx-auto">No jargon, no fear. Here’s how EMF Solutions describes their approach — and how a typical home comes together.</p>
  </div>
</section>

<section class="section bg-navy"><div class="wrap prose measure" data-reveal>
  <h2>“Subatomic chaos,” gently explained</h2>
  <p>Every wireless and electrical device adds activity to the space around it. According to EMF Solutions, the sheer density of modern signal — phones, routers, smart meters, towers, 5G and Starlink-class sources, and the newer fiber lines reaching homes — creates a kind of restlessness in the field around us. They call it <span class="hl">subatomic chaos</span>: the unsettled quality of an environment that never fully switches off.</p>
  <p>You can’t see it, but you live inside it all day and all night. The idea behind this line is simple to state: bring that field back toward calm.</p>

  <h3>Harmonize — not block</h3>
  <p>This is the most important distinction, and it’s where the line differs from shielding products. A Faraday cage or shielding fabric tries to <em>block</em> signal — which also means your phone stops working inside it. These pieces don’t do that. They’re designed to <span class="hl">harmonize</span> the surrounding environment using proprietary natural materials — hand-finished plant-based resin pieces, bands, and plug-in boxes — while your devices keep working exactly as they do now.</p>
  <p>Think of it less like building a wall, and more like tuning a room.</p>

  <h3>What the manufacturer points to</h3>
  <p>EMF Solutions cites several forms of testing in support of their approach. We share these as <span class="hl">manufacturer-reported testing</span> — described honestly, not dramatized, and not independently verified by Calming The Chaos:</p>
</div>
  <div class="wrap grid g-2" style="margin-top:28px">
    ${[
      [icon.wave, "Cellular observations", "Reported lab work looking at human cells and calcium-channel response with a Wi-Fi source present, with and without their materials nearby."],
      [icon.sparkle, "Blood microscopy", "Reported before-and-after microscopy observations."],
      [icon.bolt, "Thermal imaging", "Reported thermal-imaging comparisons."],
      [icon.leaf, "Mold-growth observations", "Reported observations of mold growth near routers under different conditions."],
      [icon.heart, "Practitioner muscle-testing", "Reported results from practitioner muscle-testing."],
      [icon.star, "Customer reports", "Many customers describe better sleep, a calmer home, easier focus, and a sense of ease."],
    ].map(([ic, h, d]) => `<div class="card feat" data-reveal><div class="ic">${ic}</div><div><h4>${h}</h4><p>${d}</p></div></div>`).join("")}
  </div>
  <div class="wrap prose measure" style="margin-top:14px"><p class="tiny">These descriptions summarize testing reported by EMF Solutions and are provided for general information. They are not claims of medical benefit and have not been independently verified. Nothing here is intended to diagnose, treat, cure, or prevent any disease.</p></div>
</section>

<section class="section bg-ice field"><div class="grain"></div>
  <div class="wrap prose measure" data-reveal>
    <h2>The fiber era</h2>
    <p>Infrastructure keeps changing. As fiber-optic lines and newer equipment have spread, EMF Solutions updated the line to a stronger, current specification — pieces marked <span class="hl">“Upgraded for Fiber.”</span> If you already own an older Home Harmonizer, you don’t have to replace it: the <a href="products/armored-upgrade.html" style="color:var(--baby-blue-deep);font-weight:700">Armored Upgrade</a> is an add-on chip meant to bring it up to current strength, at the same one-per-2,500-sq-ft rate.</p>
  </div>
  <div class="wrap" style="margin-top:36px" data-reveal>
    <h3 class="center" style="color:var(--navy)">What a typical home stack looks like</h3>
    <div class="grid g-3" style="margin-top:24px">
      ${[
        ["Whole home", "A Home Harmonizer near the electrical panel — one per ~2,500 sq ft. Add a Booster Box for larger or harder homes.", "home-harmonizer"],
        ["The bedroom", "Better ZZZ’s for the sleep zone, where you spend a third of your life.", "better-zzzs"],
        ["The router", "A Device Chip on the Wi-Fi router the whole house depends on.", "device-chip"],
        ["Your phone", "The Cell Chip Ultra, or the iCell Ultra for MagSafe iPhones.", "cell-chip-ultra"],
        ["Your laptop", "The Laptop Chip Ultra — two chips per machine.", "laptop-chip-ultra"],
        ["On the body", "An EMF Band or a Personal Card Ultra to carry the calm with you.", "emf-band"],
      ].map(([h, d, slug]) => `<a class="card lift" href="products/${slug}.html" data-reveal style="color:inherit"><div class="ic" style="color:var(--baby-blue-deep);margin-bottom:14px">${icon.check}</div><h4 style="color:var(--navy)">${h}</h4><p style="margin:0;color:#496880">${d}</p></a>`).join("")}
    </div>
  </div>
</section>
${ctaBand(0)}
`;
  return page({
    title: "How It Works — Harmonize, Not Shield | Calming The Chaos",
    desc: "How the EMF Solutions approach works: harmonizing the environmental field rather than blocking it, the fiber-era upgrade, and what a typical home stack looks like.",
    path: "how-it-works.html", depth: 0, current: "how-it-works.html",
    schema: localBiz,
  }, main);
}

/* ============================================================
   START HERE (chooser)
   ============================================================ */
function startHere() {
  const scenarios = {
    house: { label: "A house", icon: icon.home, sub: "Single-family home",
      title: "For a single-family home", lead: "Start with the building, then layer in the rooms and devices you touch most.",
      stack: ["home-harmonizer", "device-chip", "better-zzzs", "cell-chip-ultra", "emf-band"],
      note: "Larger home, metal roof, solar, or a tower nearby? Add a Booster Box. Ask Lorelei to size it." },
    apartment: { label: "An apartment", icon: icon.building, sub: "Rental or condo",
      title: "For an apartment or condo", lead: "No access to the panel? Focus on the rooms you live in, plus your phone and body.",
      stack: ["room-harmonizer", "better-zzzs", "cell-chip-ultra", "emf-band"],
      note: "Condos and larger apartments often use several Room Harmonizers to cover the whole floor plan." },
    hotel: { label: "Travel / hotel", icon: icon.hotel, sub: "On the road",
      title: "For travel and hotel stays", lead: "Pack light and still sleep in a calmer room, wherever you are.",
      stack: ["room-harmonizer", "cell-chip-ultra", "personal-card-ultra", "emf-band"],
      note: "The Room Harmonizer slips into a bag and sets on the nightstand — perfect for a week away." },
    car: { label: "The car", icon: icon.car, sub: "Commute & road trips",
      title: "For the car", lead: "A sealed metal cabin full of electronics is its own environment. Bring calm along.",
      stack: ["car-harmonizer", "cell-chip-ultra", "personal-card-ultra"],
      note: "Hybrids and EVs may need two Car Harmonizers, or a Better ZZZ’s workaround. Ask Lorelei." },
    phone: { label: "Just my phone", icon: icon.phone, sub: "A first step",
      title: "For your phone and body", lead: "The simplest place to start — the device in your hand and something for you.",
      stack: ["cell-chip-ultra", "icell-ultra", "emf-band", "personal-card-ultra"],
      note: "Android or older iPhone → Cell Chip Ultra. iPhone 12 or later → iCell Ultra." },
    family: { label: "The whole family", icon: icon.heart, sub: "Everyone covered",
      title: "For the whole family", lead: "The building, the bedrooms, and a personal piece for every member.",
      stack: ["home-bundle", "emf-band", "personal-card-ultra", "car-harmonizer"],
      note: "Bands are sized for small wrists too. Lorelei can put together a per-person plan." },
  };
  const keys = Object.keys(scenarios);
  const chooser = keys.map((k) => `<button class="choice${k === "house" ? " active" : ""}" data-choice="${k}" type="button">
    <span style="color:var(--gold-bright);display:inline-block">${scenarios[k].icon}</span>
    <b>${scenarios[k].label}</b><span>${scenarios[k].sub}</span></button>`).join("");
  const panels = keys.map((k, i) => {
    const s = scenarios[k];
    const items = s.stack.map((slug) => byId[slug]).filter(Boolean);
    return `<div class="result-panel${i === 0 ? " show" : ""}" id="res-${k}">
      <div class="card" style="padding:clamp(22px,3vw,36px)">
        <div class="eyebrow">Suggested stack</div>
        <h3>${s.title}</h3><p class="lead" style="margin-bottom:20px">${s.lead}</p>
        <div class="grid g-3">${items.map((p) => productCard(p, 0)).join("")}</div>
        <div class="pill" style="margin-top:20px;border-color:var(--gold);color:var(--gold-bright);align-items:flex-start;line-height:1.5;padding:12px 16px">${icon.sparkle}<span>${s.note}</span></div>
        <div class="btn-row" style="margin-top:20px"><a class="btn btn-gold" href="contact.html">${icon.call} Confirm this with Lorelei</a></div>
      </div>
    </div>`;
  }).join("");

  const main = `
<section class="hero" style="min-height:auto;padding-block:clamp(64px,10vw,110px)">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap center" data-reveal>
    <div class="eyebrow mx-auto">Start here</div>
    <h1>What are we <span class="gold-text">calming</span> today?</h1>
    <p class="lead measure mx-auto">Pick the space that fits your life and we’ll suggest a sensible starting stack. Every setup is confirmed with Lorelei — she’ll adjust it to your exact home.</p>
  </div>
</section>
<section class="section bg-navy field">
  <div class="wrap">
    <div class="chooser" data-reveal>${chooser}</div>
    <div class="result">${panels}</div>
  </div>
</section>
${ctaBand(0)}
`;
  return page({
    title: "Start Here — Find Your EMF Setup | Calming The Chaos",
    desc: "Tell us your space — house, apartment, hotel, car, phone, or whole family — and get a suggested EMF harmonizing stack, confirmed personally by Lorelei Shafer.",
    path: "start-here.html", depth: 0, current: "start-here.html",
    schema: localBiz,
  }, main);
}

/* ============================================================
   ABOUT
   ============================================================ */
function about() {
  const main = `
<section class="hero" style="min-height:auto;padding-block:clamp(70px,11vw,120px)">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap-wide">
    <div class="hero-grid">
      <div data-reveal>
        <div class="eyebrow">About</div>
        <h1>Meet <span class="gold-text">Lorelei Shafer</span></h1>
        <p class="lead">The calm voice behind Calming The Chaos — a guide who helps you make sense of the invisible weather in your home, and choose only what your space actually needs.</p>
        <div class="btn-row" style="margin-top:26px"><a class="btn btn-gold" href="contact.html">${icon.call} Talk with Lorelei</a><a class="btn btn-ghost" href="start-here.html">Find my setup</a></div>
      </div>
      <div class="hero-logo" data-reveal><div class="hero-orb"><div class="halo"></div><div class="ring r1"></div><div class="ring r2"></div>
        <img src="assets/img/logo-lockup.png" alt="Calming The Chaos emblem" width="480" height="187"></div></div>
    </div>
  </div>
</section>
<section class="section bg-navy"><div class="wrap prose measure" data-reveal>
  <h2>Why “Calming The Chaos”</h2>
  <p>The name says the whole thing. Modern homes are busy in ways we can’t see — a constant hum of wireless and electrical activity that never quite settles. <span class="hl">Calming the chaos</span> is the goal: bringing a space back toward a quieter, more harmonious state, so it feels like itself again.</p>
  <p>Lorelei retails the environmental-harmonizing line originally developed by <span class="hl">EMF Solutions</span>. She isn’t the manufacturer, and she doesn’t pretend to be — she’s the person who helps you understand the line, choose wisely, and set it up with confidence.</p>
  <h3>How she works with clients</h3>
  <p>There’s no pressure and no upsell. You tell Lorelei about your space — the square footage, the roof, whether there’s a tower nearby, how you sleep, what devices are always on, who’s in the household — and she helps you build the smallest, smartest set of pieces for your life. She’ll happily tell you what to skip.</p>
  <p>Many clients start with a single room or their phone, get comfortable, and grow from there. Others do the whole home at once. Either way, Lorelei meets you where you are.</p>
  <h3>Honest by design</h3>
  <p>Calming The Chaos speaks plainly. These are general-wellness pieces meant to harmonize an environment — not medical devices, and not a cure for anything. We describe the manufacturer’s testing as exactly that, and we let real customers speak in their own words about how their spaces feel.</p>
</div></section>
<section class="section bg-ice field"><div class="grain"></div>
  <div class="wrap grid g-3">
    ${[
      [icon.heart, "Personal guidance", "A real person on the other end — not a chatbot, not a funnel."],
      [icon.check, "Only what you need", "Right-sized recommendations, honest about what you can skip."],
      [icon.leaf, "Calm, not fear", "Confident, evidence-curious language — never doom or hype."],
    ].map(([ic, h, d]) => `<div class="card feat" data-reveal><div class="ic">${ic}</div><div><h4 style="color:var(--navy)">${h}</h4><p>${d}</p></div></div>`).join("")}
  </div>
</section>
<section class="section bg-navy"><div class="wrap center" data-reveal>
  <h2>Ready when you are</h2>
  <div class="contact-strip" style="max-width:720px;margin:26px auto 0">
    <a href="${site.phoneHref}"><span class="ic" style="color:var(--gold-bright)">${icon.call}</span><span><span>Call or text</span><b>${site.phone}</b></span></a>
    <a href="${site.emailHref}"><span class="ic" style="color:var(--gold-bright)">${icon.mail}</span><span><span>Email</span><b>${site.email}</b></span></a>
  </div>
</div></section>
`;
  return page({
    title: "About Lorelei Shafer — Calming The Chaos",
    desc: "Lorelei Shafer retails the EMF Solutions environmental-harmonizing line as Calming The Chaos — a personal guide who helps you choose only what your space needs.",
    path: "about.html", depth: 0, current: "about.html", schema: localBiz,
  }, main);
}

/* ============================================================
   CONTACT
   ============================================================ */
function contact() {
  const main = `
<section class="hero" style="min-height:auto;padding-block:clamp(64px,10vw,110px)">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap center" data-reveal>
    <div class="eyebrow mx-auto">Contact</div>
    <h1>Ask <span class="gold-text">Lorelei</span></h1>
    <p class="lead measure mx-auto">Tell her about your space and what’s on your mind. She’ll help you choose the right pieces — or tell you honestly if you don’t need much at all.</p>
  </div>
</section>
<section class="section bg-navy field"><div class="wrap-wide">
  <div class="grid g-2" style="gap:clamp(28px,5vw,64px);align-items:start">
    <div data-reveal>
      <div class="contact-strip" style="flex-direction:column">
        <a href="${site.phoneHref}"><span class="ic" style="color:var(--gold-bright)">${icon.call}</span><span><span>Call or text</span><b>${site.phone}</b></span></a>
        <a href="${site.emailHref}"><span class="ic" style="color:var(--gold-bright)">${icon.mail}</span><span><span>Email</span><b>${site.email}</b></span></a>
      </div>
      <div class="card" style="margin-top:20px">
        <h4>What helps Lorelei help you</h4>
        <ul style="color:var(--baby-blue-soft);padding-left:1.1em;margin:8px 0 0">
          <li>Roughly how many square feet, and how many floors</li>
          <li>Metal roof, solar panels, or a cell tower nearby?</li>
          <li>House, apartment, condo, or something you’re renting</li>
          <li>What’s on your mind — sleep, focus, a calmer home</li>
          <li>Your exact phone model, if you want a chip</li>
        </ul>
        <p class="tiny" style="margin-top:14px">${disclaimerShort}</p>
      </div>
    </div>
    <div class="card" data-reveal>
      <h3 class="gold-text">Send a note</h3>
      <p style="color:var(--baby-blue-soft);margin-bottom:18px">This opens your email app with the details filled in — no account required.</p>
      <form class="form" id="contact-form">
        <div class="form-2">
          <div class="field"><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="name" placeholder="First and last" required></div>
          <div class="field"><label for="location">City &amp; state</label><input id="location" name="location" type="text" placeholder="e.g. Dallas, TX"></div>
        </div>
        <div class="field"><label for="hometype">Type of space</label>
          <select id="hometype" name="hometype">
            <option value="">Choose one…</option>
            <option>House</option><option>Apartment</option><option>Condo</option>
            <option>Hotel / travel</option><option>Office</option><option>Car only</option><option>Just my phone</option>
          </select></div>
        <div class="field"><label for="concern">What’s bothering you?</label>
          <input id="concern" name="concern" type="text" placeholder="Sleep, focus, a calmer home, a nearby tower…"></div>
        <div class="field"><label for="message">Anything else?</label>
          <textarea id="message" name="message" placeholder="Square footage, roof type, devices, household size — whatever you’d like Lorelei to know."></textarea></div>
        <button class="btn btn-gold btn-block" type="submit">${icon.mail} Send to Lorelei</button>
        <p class="tiny center">Prefer to talk? Call or text <a href="${site.phoneHref}" style="color:var(--cyan-glow)">${site.phone}</a>.</p>
      </form>
    </div>
  </div>
</div></section>
`;
  return page({
    title: "Contact Lorelei — Calming The Chaos",
    desc: "Call, text, or email Lorelei Shafer at Calming The Chaos. Tell her about your space and get a personal, no-pressure recommendation.",
    path: "contact.html", depth: 0, current: "contact.html",
    schema: { ...localBiz, "@type": "LocalBusiness", contactPoint: { "@type": "ContactPoint", telephone: "+19728387600", email: site.email, contactType: "sales" } },
  }, main);
}

/* ============================================================
   FAQ
   ============================================================ */
function faqPage() {
  const main = `
<section class="hero" style="min-height:auto;padding-block:clamp(64px,10vw,110px)">
  <div class="hero-aura"></div><div class="hero-grain"></div>
  <div class="wrap center" data-reveal>
    <div class="eyebrow mx-auto">Questions</div>
    <h1>Clear answers, <span class="gold-text">no fear</span></h1>
    <p class="lead measure mx-auto">The things people ask most — about harmonizing vs. shielding, fiber, phone chips, sizing a home, and what to expect.</p>
  </div>
</section>
<section class="section bg-navy"><div class="wrap" style="max-width:820px">
  <div class="acc" data-reveal>
    ${faqs.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${f.q} <span class="pm"></span></summary><div class="acc-body"><p style="margin:0">${f.a}</p></div></details>`).join("")}
  </div>
  <p class="tiny" style="margin-top:24px">${disclaimerShort}</p>
</div></section>
${ctaBand(0)}
`;
  return page({
    title: "FAQ — Calming The Chaos EMF Harmonizers",
    desc: "Answers on harmonize vs. shield, the fiber upgrade, iPhone vs. Android chips, sizing Home Harmonizers, metal roofs, kids’ bands, adjustable beds, and EVs.",
    path: "faq.html", depth: 0, current: "faq.html",
    schema: {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, "") } })),
    },
  }, main);
}

/* ============================================================
   LEGAL
   ============================================================ */
function legal() {
  const main = `
<section class="section" style="padding-top:clamp(70px,10vw,110px)"><div class="wrap prose" style="max-width:820px">
  <div class="eyebrow">Legal</div>
  <h1>Privacy, Terms &amp; Wellness Disclaimer</h1>
  <p class="lead">Plain-language policies for Calming The Chaos. Last updated <span class="js-year">2026</span>.</p>

  <h2>Wellness disclaimer</h2>
  <p>${disclaimerFull}</p>
  <p>Nothing on this website is medical advice. If you have a health concern, please consult a qualified healthcare professional. Individual experiences with these products vary, and no specific result is promised or guaranteed.</p>

  <h2>About these products</h2>
  <p>The products offered here were originally developed by <span class="hl">EMF Solutions</span> and are retailed by Calming The Chaos (Lorelei Shafer). Calming The Chaos is an independent retailer and is not the manufacturer. References to laboratory testing, blood microscopy, thermal imaging, mold observations, and practitioner testing describe testing reported by the manufacturer; these descriptions are provided for general information and have not been independently verified by Calming The Chaos.</p>

  <h2>Pricing</h2>
  <p>Prices shown as “$X.XX” are placeholders while retail pricing is finalized. Please contact Lorelei for current pricing and availability. No online payment is processed through this site at this time.</p>

  <h2>Privacy</h2>
  <p>We respect your privacy. Information you share — by phone, text, email, or the contact form — is used only to respond to you and to help you choose products. The contact form opens your own email application; it does not store your details on this website. We do not sell your personal information. We use minimal, privacy-respecting analytics, if any, and no third-party advertising trackers.</p>

  <h2>Terms of use</h2>
  <p>This website is provided for general information about the products Calming The Chaos offers. Content may be updated at any time. Product descriptions summarize information from the manufacturer and are offered in good faith; specifications and availability can change. By using this site you agree to use it lawfully and not to rely on it as medical or professional advice.</p>

  <h2>Contact</h2>
  <p>Questions about these policies? Reach Lorelei at <a href="${site.phoneHref}" style="color:var(--cyan-glow)">${site.phone}</a> or <a href="${site.emailHref}" style="color:var(--cyan-glow)">${site.email}</a>.</p>
</div></section>
`;
  return page({
    title: "Legal, Privacy & Wellness Disclaimer — Calming The Chaos",
    desc: "Privacy policy, terms of use, and wellness disclaimer for Calming The Chaos. General wellness products originally developed by EMF Solutions.",
    path: "legal.html", depth: 0, current: "", schema: localBiz,
  }, main);
}

/* ============================================================
   404
   ============================================================ */
function notFound() {
  const main = `<section class="hero"><div class="hero-aura"></div><div class="wrap center">
    <div class="eyebrow mx-auto">404</div><h1>This page drifted <span class="gold-text">off the field</span></h1>
    <p class="lead measure mx-auto">The page you’re looking for isn’t here — but the calm is. Let’s get you back.</p>
    <div class="btn-row" style="justify-content:center;margin-top:24px"><a class="btn btn-gold" href="index.html">Back home ${icon.arrow}</a><a class="btn btn-ghost" href="shop.html">Shop the line</a></div>
  </div></section>`;
  return page({ title: "Page not found — Calming The Chaos", desc: "Page not found.", path: "404.html", depth: 0 }, main);
}

/* ---------- sitemap + robots ---------- */
function sitemap() {
  const urls = ["index.html", "shop.html", "how-it-works.html", "start-here.html", "about.html", "contact.html", "faq.html", "legal.html"]
    .concat(products.map((p) => "products/" + p.slug + ".html"));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.url}/${u}</loc></url>`).join("\n")}
</urlset>`;
}

/* ============================================================
   BUILD
   ============================================================ */
write("index.html", home());
write("shop.html", shop());
write("how-it-works.html", howItWorks());
write("start-here.html", startHere());
write("about.html", about());
write("contact.html", contact());
write("faq.html", faqPage());
write("legal.html", legal());
write("404.html", notFound());
products.forEach((p) => write("products/" + p.slug + ".html", productPage(p)));
write("sitemap.xml", sitemap());
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
write(".nojekyll", "");

/* copy static assets */
cpSync(new URL("./assets/", import.meta.url).pathname, OUT + "assets/", { recursive: true });

console.log("Built " + (8 + 1 + products.length) + " pages + " + products.length + " products. Output: " + OUT);
