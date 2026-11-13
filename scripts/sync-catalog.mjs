#!/usr/bin/env node
/*
 * Rebuilds assets/data/catalog.json from the shipped product pages.
 *
 * Prices are hand-edited in products/*.html. The checkout server charges from
 * catalog.json, so after changing a price on a product page run:
 *
 *   node scripts/sync-catalog.mjs          # rewrite catalog.json
 *   node scripts/sync-catalog.mjs --check  # exit 1 if catalog.json is stale
 *
 * Each product page has exactly one "Add" button (.js-add with data-sku,
 * data-name, data-icon) and one hero price (<div class="price gold-text">$…</div>).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsDir = join(root, "products");
const outFile = join(root, "assets", "data", "catalog.json");

export function buildCatalog() {
  const products = {};
  for (const file of readdirSync(productsDir).filter((f) => f.endsWith(".html")).sort()) {
    const sku = file.replace(/\.html$/, "");
    const html = readFileSync(join(productsDir, file), "utf8");
    const btn = html.match(/<button[^>]*\bjs-add\b[^>]*>/);
    if (!btn) throw new Error(`${file}: no .js-add button`);
    const attr = (n) => (btn[0].match(new RegExp(`data-${n}="([^"]*)"`)) || [])[1];
    const name = attr("name");
    const icon = attr("icon") || "chip";
    if (attr("sku") && attr("sku") !== sku) throw new Error(`${file}: data-sku "${attr("sku")}" != ${sku}`);
    // hero price: the first price div that is not a "Retail" tile price
    const price = html.match(/<div class="price gold-text">\$([0-9]+\.[0-9]{2})\s*(?:<small|<\/div>)/);
    if (!name || !price) throw new Error(`${file}: missing name or hero price`);
    const priceCents = Math.round(Number(price[1]) * 100);
    products[sku] = { name: decode(name), icon, priceCents, url: `/products/${file}` };
  }
  return { currency: "USD", products };
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/&mdash;/g, "—");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const next = JSON.stringify(buildCatalog(), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    const cur = readFileSync(outFile, "utf8");
    if (cur !== next) {
      console.error("catalog.json is out of date — run: node scripts/sync-catalog.mjs");
      process.exit(1);
    }
    console.log("catalog.json matches product pages");
  } else {
    writeFileSync(outFile, next);
    console.log(`wrote ${outFile} (${Object.keys(JSON.parse(next).products).length} products)`);
  }
}
