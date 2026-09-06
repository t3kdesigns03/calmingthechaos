CALMING THE CHAOS — PRODUCT PHOTOS
==================================

Every product tile and product-page hero is already wired to a local image at:
    assets/img/products/<slug>.webp

Until a file exists, the tile automatically falls back to the current gold/teal
icon plate (the <img> removes itself on error). So you can drop files in over
time, in any order, WITHOUT editing any HTML.

HOW TO ADD A PHOTO
------------------
1. Open the matching product page on emfsol.com.
2. Save a GALLERY still of the physical object only — box on white, band on a
   wrist, chip close-up, strap, car plug, etc.
   • Do NOT use the stamped marketing slides (red "UPGRADED & VITAL",
     green "Add to cart", their logo lockup). Crop out any arrows/stamps.
   • Only use images you have permission to use as an authorized seller.
3. Crop tight and square-ish, remove overlays in an editor if needed.
4. Export WebP, longest side ~1200px, target 40–90 KB.
   (Optional: also drop a same-name .png as a fallback — not required.)
5. Name it exactly <slug>.webp from the list below and drop it in this folder.
6. Commit + push. Netlify rebuilds and the photo appears on the shop tile
   AND the product page automatically.

The plate uses object-fit: cover on a baby-blue background, so a clean
white-background still or a lifestyle still both look right.

SLUG LIST (filename  →  product)
--------------------------------
home-harmonizer.webp                 → Home Harmonizer
booster-box.webp                     → Booster Box
room-harmonizer.webp                 → Room Harmonizer
better-zzzs.webp                     → Better ZZZ’s
emf-band.webp                        → EMF Band
emf-band-xl.webp                     → EMF Band XL
personal-card-ultra.webp             → Personal Card Ultra
cell-chip-ultra.webp                 → Cell Chip Ultra
icell-ultra.webp                     → iCell Ultra
laptop-chip-ultra.webp               → Laptop Chip Ultra
device-chip.webp                     → Device Chip
car-harmonizer.webp                  → Car Harmonizer
armored-upgrade.webp                 → Armored Upgrade
xl-band-face-replacement.webp        → XL Band Face Replacement
xl-band-alternative-nylon-band.webp  → XL Band Alternative Nylon Band
xl-band-replacement-silicone-band.webp → XL Band Replacement Silicone Band
home-bundle.webp                     → Home Bundle  (group shot of the trio)
bare-minimum.webp                    → Bare Minimum (starter set shot)

NOTES
-----
• No hotlinking to emfsol.com — always host the file here.
• If a clean still doesn’t exist for a SKU, just leave it: that tile keeps the
  branded icon plate, which looks intentional.
