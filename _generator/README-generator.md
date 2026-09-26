# Calming The Chaos — site generator

Static site generator (no framework, Node 18+). Regenerates every page from data.

## Usage
```
cd _generator
node build.mjs          # writes the full site to ../ (repo root)
```
By default `build.mjs` outputs to `../site/`. To deploy to the repo root,
either copy `site/*` up one level, or set OUT in build.mjs to `../`.

## Structure
- build.mjs        — orchestrates; page templates (home, shop, product, etc.)
- lib/data.mjs     — site config, 18 products + copy, collections, FAQ, testimonials, disclaimers
- lib/svg.mjs      — custom gold/cyan SVG product plates + UI icons
- lib/layout.mjs   — <head>/SEO/OG/schema, header, footer, cart drawer, product card
- assets/          — styles.css, app.js, img/mark.svg (logo lockup + og-banner are generated from Logo2.png)

## Editing
- Change product copy/prices → lib/data.mjs (prices are the literal string `$X.XX`)
- Change look → assets/css/styles.css (all color tokens at top)
- Add a product → add an object to `products` in lib/data.mjs, rebuild

## Product photos (EMF Solutions catalog, hosted locally)
```
cd _generator
node pull-emfsol-images.mjs   # download originals into ../assets/img/products/ + wire the shipped pages
node apply-product-photos.mjs # (re)wire the shipped pages only — no network
node build.mjs                # regenerate pages — see warning below
```
- Source: the public WooCommerce Store API (`https://emfsol.com/wp-json/wc/store/v1/products`,
  no keys). Only `images[].src` (the full original) is stored, never WP crop sizes.
- Parent → CTC slug map lives at the top of `pull-emfsol-images.mjs`. Anything not in it
  (Daystar SKUs, new parent products) is skipped.
- Files: `assets/img/products/<ctc-slug>/01.<ext>, 02.<ext> …` in the parent's gallery order,
  original extension kept. `01` is the hero used on cards. `manifest.json` lists them all.
  They live at the repo-root path because the live site is served from the repo root.
- `pull-emfsol-images.mjs` also writes `image` + `gallery` into every product in
  `lib/data.mjs`, so `build.mjs` renders the same photos (it copies `../assets/img/products/`
  into its output when OUT isn't the repo root).
- Re-running is safe: files whose size already matches are skipped and the HTML patch is
  idempotent (the product-page gallery sits between `<!-- ctc-gallery:start/end -->` markers).
- No photos for a product → its SVG plate stays. A photo that 404s removes itself and the
  plate shows through.

**Warning — `build.mjs` is out of sync with the shipped site.** The v2 theme, real prices and the
PMA line were edited straight into the shipped HTML after the last generate. Running `build.mjs`
into the repo root would overwrite them. Use `apply-product-photos.mjs` for the shipped pages;
set `CTC_OUT=/some/tmp/dir node build.mjs` if you want to preview the generator's output.
