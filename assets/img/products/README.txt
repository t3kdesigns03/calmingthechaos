CALMING THE CHAOS — PRODUCT PHOTOS
==================================

These are the EMF Solutions (parent catalog) product photos, hosted locally so the
live site never hotlinks emfsol.com.

LAYOUT
------
    assets/img/products/<slug>/01.<ext>   ← hero: shop cards, home features, Start Here, "pairs with"
    assets/img/products/<slug>/02.<ext>   ← the rest of the product-page gallery, in parent order
    ...
    assets/img/products/manifest.json     ← { "<slug>": ["01.png", "02.jpg", ...] }

Original files and extensions are kept as the parent publishes them.

UPDATE / RE-SYNC
----------------
From Git Bash:
    cd _generator
    node pull-emfsol-images.mjs

That downloads anything new or changed, rewrites manifest.json, updates
_generator/lib/data.mjs and re-wires every card and product-page gallery. Then
commit + push as usual. Re-running is safe.

CHANGING A HERO
---------------
The hero is always 01.*. To use a different shot on the cards, swap the file
names (e.g. rename 01.png ↔ 03.jpg), list the new order in manifest.json, and run
    node apply-product-photos.mjs
(A later pull-emfsol-images.mjs run goes back to the parent's order.)

FALLBACK
--------
A product with no photos keeps its gold/teal SVG plate. Any photo that fails to
load removes itself and the plate shows through.

SLUGS (CTC ← EMF Solutions)
---------------------------
home-harmonizer ← home-harmonizer            car-harmonizer ← car-harmonizer
booster-box ← booster-box                    armored-upgrade ← armored-upgrade
room-harmonizer ← room-harmonizer            xl-band-face-replacement ← xl-band-face-replacement
better-zzzs ← better-zzzs                    xl-band-alternative-nylon-band ← xl-bands-replacement-band
emf-band ← emf-band                          xl-band-replacement-silicone-band ← xl-bands-replacement-silicone-band
emf-band-xl ← emf-band-xl                    home-bundle ← home-bundle
personal-card-ultra ← personal-card-ultra    bare-minimum ← bare-minimum
cell-chip-ultra ← cell-chip-ultra            device-chip ← device-chip
icell-ultra ← icell-chip-ultra               laptop-chip-ultra ← laptop-chip-ultra
Skipped on purpose: daystar-better-zzzs, daystar-xl-band.
