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
