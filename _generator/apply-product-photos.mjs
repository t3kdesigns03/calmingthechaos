#!/usr/bin/env node
/*
 * Wire the locally hosted product photos into the SHIPPED site (repo root).
 *
 *   cd _generator
 *   node apply-product-photos.mjs
 *
 * Reads assets/img/products/manifest.json (written by pull-emfsol-images.mjs) and:
 *   • every product card (.pcard > .plate) on every page → hero photo (01.*)
 *     over the SVG plate; onerror falls back to the plate
 *   • every product page .pd-media → photo stage + thumbnail strip (all photos)
 *   • Product JSON-LD "image" → absolute URLs of the gallery
 *
 * Why not `node build.mjs`? The shipped HTML was hand-edited after the last
 * generate (v2 theme, prices, PMA line), so regenerating would overwrite it.
 * This script edits the shipped pages in place and is idempotent.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "..");

const attr = (tag, name) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag); return m ? m[1] : null; };

function htmlFiles(root) {
  const top = readdirSync(root).filter((f) => f.endsWith(".html")).map((f) => ({ file: join(root, f), depth: 0 }));
  const pdir = join(root, "products");
  const prod = existsSync(pdir) ? readdirSync(pdir).filter((f) => f.endsWith(".html")).map((f) => ({ file: join(pdir, f), depth: 1, slug: f.replace(/\.html$/, "") })) : [];
  return [...top, ...prod];
}

/* ---------- cards ---------- */
function patchCards(html, depth, manifest, names) {
  let n = 0;
  const prefix = depth ? "../" : "";
  const out = html.replace(/(<a\b[^>]*>)(\s*<div class="plate">)(<img class="pphoto[^"]*"[^>]*>)?/g, (m, aTag, plateOpen, oldImg) => {
    if (!/\bpcard\b/.test(attr(aTag, "class") || "")) return m;
    const href = attr(aTag, "href") || "";
    const sm = /(?:^|\/)([a-z0-9-]+)\.html(?:[#?].*)?$/.exec(href);
    const slug = sm && sm[1];
    const files = slug && manifest[slug];
    if (!files || !files.length) {
      // no photos → leave the card as it was, but drop a photo this script added earlier
      return oldImg && /plate-photo/.test(oldImg) ? aTag + plateOpen : m;
    }
    const alt = (oldImg && attr(oldImg, "alt")) || attr(aTag, "aria-label") || names[slug] || slug;
    if (alt) names[slug] = names[slug] || alt;
    n++;
    return `${aTag}${plateOpen}<img class="pphoto plate-photo" src="${prefix}assets/img/products/${slug}/${files[0]}" alt="${alt}" width="800" height="600" loading="lazy" decoding="async" onerror="this.remove()">`;
  });
  return { html: out, n };
}

/* ---------- product page gallery ---------- */
const START = "<!-- ctc-gallery:start -->";
const END = "<!-- ctc-gallery:end -->";

function galleryBlock(slug, files, name, fallback, nl, ind) {
  const src = (f) => `../assets/img/products/${slug}/${f}`;
  const total = files.length;
  const altN = (i) => `${name} — photo ${i + 1} of ${total}`; // name is already HTML-escaped text
  const L = [];
  L.push(`${START}`);
  L.push(`${ind}<div class="pd-gallery" data-reveal>`);
  L.push(`${ind}  <div class="pd-media">`);
  L.push(`${ind}    <img class="pphoto pd-main" src="${src(files[0])}" alt="${total > 1 ? altN(0) : name}" width="1000" height="1000" fetchpriority="high" decoding="async" onerror="this.remove()">`);
  L.push(`${ind}    ${fallback.trim()}`);
  L.push(`${ind}  </div>`);
  if (total > 1) {
    L.push(`${ind}  <div class="pd-thumbs" role="group" aria-label="${name} photos">`);
    files.forEach((f, i) => {
      L.push(`${ind}    <button type="button" class="pd-thumb${i ? "" : " is-active"}"${i ? "" : ' aria-current="true"'} aria-label="Show photo ${i + 1} of ${total}" data-src="${src(f)}" data-alt="${altN(i)}"><img src="${src(f)}" alt="" width="120" height="120" loading="lazy" decoding="async"></button>`);
    });
    L.push(`${ind}  </div>`);
  }
  L.push(`${ind}</div>`);
  L.push(`${ind}${END}`);
  return L.join(nl);
}

function patchProductPage(html, slug, manifest, names, nl) {
  const files = manifest[slug] || [];
  let region, fallback, ind = "      ";
  const s = html.indexOf(START), e = html.indexOf(END);
  if (s >= 0 && e > s) {
    region = [s, e + END.length];
  } else {
    const m = /<div class="pd-media" data-reveal>[\s\S]*?<\/svg>\s*<\/div>/.exec(html);
    if (!m) return { html, changed: false, why: "no .pd-media" };
    region = [m.index, m.index + m[0].length];
    const lineStart = html.lastIndexOf("\n", m.index) + 1;
    ind = html.slice(lineStart, m.index).replace(/\S/g, "") || ind;
  }
  if (s >= 0) { const lineStart = html.lastIndexOf("\n", s) + 1; ind = html.slice(lineStart, s).replace(/\S/g, "") || ind; }
  const chunk = html.slice(region[0], region[1]);
  const fb = /<div class="glow"><\/div>\s*<svg[\s\S]*?<\/svg>/.exec(chunk) || /<svg[\s\S]*?<\/svg>/.exec(chunk);
  fallback = fb ? fb[0] : "";
  const name = names[slug] || (/<h1>([^<]*)<\/h1>/.exec(html) || [])[1] || slug;

  let block;
  if (files.length) {
    block = galleryBlock(slug, files, name, fallback, nl, ind);
  } else {
    // no photos → plain plate (original structure, minus any dead <img>)
    block = `<div class="pd-media" data-reveal>${nl}${ind}  ${fallback.trim()}${nl}${ind}</div>`;
  }
  const out = html.slice(0, region[0]) + block + html.slice(region[1]);
  return { html: out, changed: out !== html };
}

/* ---------- JSON-LD Product image ---------- */
function patchSchema(html, slug, manifest) {
  const files = manifest[slug];
  if (!files || !files.length) return html;
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, a, json, b) => {
    let data;
    try { data = JSON.parse(json); } catch { return m; }
    if (data["@type"] !== "Product") return m;
    const url = (data.offers && data.offers.url) || "";
    const baseUrl = url.includes("/products/") ? url.slice(0, url.indexOf("/products/")) : null;
    if (!baseUrl) return m;
    const imgs = files.map((f) => `${baseUrl}/assets/img/products/${slug}/${f}`);
    // keep key order: rebuild with image in the same slot
    const next = {};
    for (const k of Object.keys(data)) next[k] = k === "image" ? imgs : data[k];
    if (!("image" in next)) next.image = imgs;
    return a + JSON.stringify(next) + b;
  });
}

export function applyPhotos({ root = DEFAULT_ROOT, log = true } = {}) {
  const manifestPath = join(root, "assets", "img", "products", "manifest.json");
  if (!existsSync(manifestPath)) throw new Error("No manifest at " + manifestPath + " — run pull-emfsol-images.mjs first.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const names = {};
  const pages = htmlFiles(root);
  // product pages first so their <h1>/card alts seed names
  let cards = 0, galleries = 0, changedFiles = 0;
  for (const { file, depth, slug } of pages) {
    const before = readFileSync(file, "utf8");
    const nl = before.includes("\r\n") ? "\r\n" : "\n";
    let html = before;
    const c = patchCards(html, depth, manifest, names);
    html = c.html; cards += c.n;
    if (slug) {
      const h1 = /<h1>([^<]*)<\/h1>/.exec(html);
      if (h1) names[slug] = h1[1];
      const g = patchProductPage(html, slug, manifest, names, nl);
      html = g.html;
      if ((manifest[slug] || []).length) galleries++;
      html = patchSchema(html, slug, manifest);
    }
    if (html !== before) { writeFileSync(file, html); changedFiles++; }
  }
  const noPhotos = pages.filter((p) => p.slug && !(manifest[p.slug] || []).length).map((p) => p.slug);
  if (log) {
    console.log(`apply: ${cards} product cards → photos, ${galleries} product-page galleries, ${changedFiles} files changed`);
    if (noPhotos.length) console.log(`apply: no photos (SVG plate kept): ${noPhotos.join(", ")}`);
  }
  return { cards, galleries, changedFiles, noPhotos };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootArg = process.argv.find((a) => a.startsWith("--root="));
  applyPhotos({ root: rootArg ? resolve(rootArg.slice(7)) : DEFAULT_ROOT });
}
