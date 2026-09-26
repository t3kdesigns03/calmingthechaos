#!/usr/bin/env node
/*
 * Pull every product gallery image from the EMF Solutions (parent/wholesale)
 * WooCommerce catalog and host it locally for Calming The Chaos.
 *
 *   cd _generator
 *   node pull-emfsol-images.mjs            # download + manifest + data.mjs + wire shipped HTML
 *   node pull-emfsol-images.mjs --no-apply # download + manifest + data.mjs only
 *
 * Source of truth: public Store API (no auth)
 *   GET https://emfsol.com/wp-json/wc/store/v1/products
 * Only images[].src (the full original) is stored — never WP crop sizes.
 *
 * Output (deployed as-is — the live site is served from the repo root):
 *   assets/img/products/<ctc-slug>/01.<ext>, 02.<ext>, ...   (01 = hero / card)
 *   assets/img/products/manifest.json
 *
 * Idempotent: a file whose size already matches the server's is skipped.
 * Node 18+, no dependencies.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DEST = join(ROOT, "assets", "img", "products");
const MANIFEST = join(DEST, "manifest.json");
const DATA = join(HERE, "lib", "data.mjs");

const API_BASE = (process.env.EMFSOL_BASE || "https://emfsol.com").replace(/\/$/, "");
const API = API_BASE + "/wp-json/wc/store/v1/products";
const UA = "Mozilla/5.0 (compatible; CalmingTheChaos-ImageSync/1.0; +https://ctc.t3kdesigns.app)";
const TIMEOUT_MS = 45_000;
const RETRIES = 3;
const MAX_BYTES = 5 * 1024 * 1024; // >5MB gets flagged (see README)

/* parent slug -> CTC slug. Anything not listed (e.g. daystar-*) is ignored. */
export const SLUG_MAP = {
  "home-harmonizer": "home-harmonizer",
  "booster-box": "booster-box",
  "room-harmonizer": "room-harmonizer",
  "better-zzzs": "better-zzzs",
  "emf-band": "emf-band",
  "emf-band-xl": "emf-band-xl",
  "personal-card-ultra": "personal-card-ultra",
  "cell-chip-ultra": "cell-chip-ultra",
  "icell-chip-ultra": "icell-ultra",
  "laptop-chip-ultra": "laptop-chip-ultra",
  "device-chip": "device-chip",
  "car-harmonizer": "car-harmonizer",
  "armored-upgrade": "armored-upgrade",
  "xl-band-face-replacement": "xl-band-face-replacement",
  "xl-bands-replacement-band": "xl-band-alternative-nylon-band",
  "xl-bands-replacement-silicone-band": "xl-band-replacement-silicone-band",
  "home-bundle": "home-bundle",
  "bare-minimum": "bare-minimum",
};

const OK_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, opts = {}) {
  let lastErr;
  for (let i = 1; i <= RETRIES; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { "User-Agent": UA, Accept: opts.accept || "*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status >= 500 || res.status === 429) throw new Error("HTTP " + res.status);
      if (!res.ok) { const e = new Error("HTTP " + res.status); e.fatal = true; throw e; }
      return res;
    } catch (e) {
      lastErr = e;
      if (e.fatal || i === RETRIES) break;
      await sleep(800 * i * i);
    }
  }
  throw new Error(`${url} → ${lastErr && lastErr.message}`);
}

async function fetchAllProducts() {
  const all = [];
  for (let page = 1; ; page++) {
    const res = await fetchRetry(`${API}?per_page=100&page=${page}`, { accept: "application/json" });
    const batch = await res.json();
    all.push(...batch);
    const pages = Number(res.headers.get("x-wp-totalpages") || 1);
    if (page >= pages || !batch.length) {
      console.log(`Store API: ${all.length} products (X-WP-Total ${res.headers.get("x-wp-total") ?? "?"})`);
      return all;
    }
  }
}

/* Reject WP-generated crops like -300x300.jpg / -600x450.png as masters. */
const isCrop = (src) => /-\d{2,4}x\d{2,4}\.[a-z]+$/i.test(new URL(src).pathname);

function extFor(src, contentType) {
  let ext = extname(new URL(src).pathname).toLowerCase();
  if (ext === ".jpeg") ext = ".jpg";
  if (OK_EXT.has(ext)) return ext;
  const ct = (contentType || "").split(";")[0].trim();
  return { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif" }[ct] || ".jpg";
}

async function download(src, dir, index) {
  const res = await fetchRetry(src, { accept: "image/*" });
  const ext = extFor(src, res.headers.get("content-type"));
  const name = String(index).padStart(2, "0") + ext;
  const file = join(dir, name);
  const len = Number(res.headers.get("content-length") || 0);
  if (len && existsSync(file) && statSync(file).size === len) {
    try { await res.body?.cancel(); } catch {}
    return { name, bytes: len, skipped: true };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (existsSync(file) && statSync(file).size === buf.length) return { name, bytes: buf.length, skipped: true };
  writeFileSync(file, buf);
  return { name, bytes: buf.length, skipped: false };
}

/* Insert / replace `image:` + `gallery:` on each product in lib/data.mjs. */
export function patchDataMjs(manifest, file = DATA) {
  if (!existsSync(file)) return 0;
  let src = readFileSync(file, "utf8");
  const nl = src.includes("\r\n") ? "\r\n" : "\n";
  let n = 0;
  for (const [slug, files] of Object.entries(manifest)) {
    const start = src.indexOf(`slug: "${slug}"`);
    if (start < 0) continue;
    // product object ends at the first "\n  }," / "\n  }" after the slug
    const endMatch = /\r?\n  \},?/.exec(src.slice(start));
    if (!endMatch) continue;
    const end = start + endMatch.index;
    let block = src.slice(start, end);
    block = block.replace(/\r?\n    image: "[^"]*",/g, "").replace(/\r?\n    gallery: \[[\s\S]*?\],/g, "");
    if (files.length) {
      const paths = files.map((f) => `assets/img/products/${slug}/${f}`);
      const lines = `${nl}    image: "${paths[0]}",${nl}    gallery: [${nl}${paths.map((p) => `      "${p}",`).join(nl)}${nl}    ],`;
      // put it right after the line that holds `icon:` (fallback: after the slug line)
      if (/\n    icon: /.test(block)) block = block.replace(/\n    icon: [^\r\n]*/, (m) => m + lines);
      else block = block.replace(/^[^\r\n]*/, (m) => m + lines);
    }
    src = src.slice(0, start) + block + src.slice(end);
    n++;
  }
  writeFileSync(file, src);
  return n;
}

async function main() {
  const noApply = process.argv.includes("--no-apply");
  mkdirSync(DEST, { recursive: true });
  const products = await fetchAllProducts();
  const manifest = {};
  const report = [];
  const seenParents = new Set();
  let failures = 0;

  for (const p of products) {
    const ctc = SLUG_MAP[p.slug];
    if (!ctc) { console.log(`  skip  ${p.slug} (not in CTC catalog)`); continue; }
    seenParents.add(p.slug);
    const dir = join(DEST, ctc);
    mkdirSync(dir, { recursive: true });

    // gallery order from the API; drop duplicates the parent listed twice
    const srcs = [];
    for (const img of p.images || []) {
      if (!img || !img.src || srcs.includes(img.src)) continue;
      if (isCrop(img.src)) console.warn(`  warn  ${ctc}: ${img.src} looks like a WP crop — stored anyway (it's the only src)`);
      srcs.push(img.src);
    }

    const files = [];
    let bytes = 0, fresh = 0;
    for (let i = 0; i < srcs.length; i++) {
      try {
        const r = await download(srcs[i], dir, i + 1);
        files.push(r.name);
        bytes += r.bytes;
        if (!r.skipped) fresh++;
        if (r.bytes > MAX_BYTES) console.warn(`  warn  ${ctc}/${r.name} is ${(r.bytes / 1048576).toFixed(1)} MB (>5 MB) — resize longest edge to 1600px`);
      } catch (e) {
        failures++;
        console.error(`  FAIL  ${ctc} #${i + 1}: ${e.message}`);
      }
    }
    manifest[ctc] = files;
    report.push({ ctc, parent: p.slug, count: files.length, fresh, kb: Math.round(bytes / 1024) });
  }

  // stable, CTC-catalog order
  const ordered = {};
  for (const ctc of Object.values(SLUG_MAP)) if (manifest[ctc]) ordered[ctc] = manifest[ctc];
  writeFileSync(MANIFEST, JSON.stringify(ordered, null, 2) + "\n");

  console.log("\nProduct                               imgs  new   size");
  console.log("------------------------------------  ----  ---  --------");
  let total = 0;
  for (const r of report.sort((a, b) => Object.values(SLUG_MAP).indexOf(a.ctc) - Object.values(SLUG_MAP).indexOf(b.ctc))) {
    total += r.count;
    console.log(`${r.ctc.padEnd(36)}  ${String(r.count).padStart(4)}  ${String(r.fresh).padStart(3)}  ${String(r.kb).padStart(6)} KB`);
  }
  const missing = Object.keys(SLUG_MAP).filter((s) => !seenParents.has(s));
  const empty = report.filter((r) => !r.count).map((r) => r.ctc);
  console.log(`\n${report.length} products, ${total} images → ${DEST}`);
  if (missing.length) console.warn(`Not found in parent catalog: ${missing.join(", ")}`);
  if (empty.length) console.warn(`Zero images (will keep the SVG plate): ${empty.join(", ")}`);
  if (failures) console.warn(`${failures} download(s) failed — re-run to retry.`);

  const patched = patchDataMjs(ordered);
  console.log(`data.mjs: image + gallery written for ${patched} products`);

  if (!noApply) {
    const { applyPhotos } = await import("./apply-product-photos.mjs");
    applyPhotos({ log: true });
  }
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
