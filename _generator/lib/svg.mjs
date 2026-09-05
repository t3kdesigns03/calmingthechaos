/* Custom line-art SVG system — gold + cyan on navy glass.
   Each plate is standalone. Shared gradient ids are identical across
   instances (browsers resolve url(#id) to first match — visually identical). */

const defs = `<defs>
  <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6AF0FF"/><stop offset="1" stop-color="#3AA6C9"/>
  </linearGradient>
  <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F6DE8B"/><stop offset=".5" stop-color="#D4AF37"/><stop offset="1" stop-color="#C9A227"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="42%" r="55%">
    <stop offset="0" stop-color="#3EE0FF" stop-opacity=".55"/><stop offset="1" stop-color="#3EE0FF" stop-opacity="0"/>
  </radialGradient>
</defs>`;

const S = (inner) => `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">${defs}${inner}</svg>`;
const glow = `<circle cx="60" cy="54" r="46" fill="url(#glow)"/>`;
const wave = (cx, cy, s) => `
  <g stroke="url(#cg)" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".95">
    <path d="M${cx - 9 * s} ${cy} a${9 * s} ${9 * s} 0 0 1 ${18 * s} 0"/>
    <path d="M${cx - 14 * s} ${cy} a${14 * s} ${14 * s} 0 0 1 ${28 * s} 0" opacity=".7"/>
    <circle cx="${cx}" cy="${cy + 2 * s}" r="${2 * s}" fill="url(#cg)" stroke="none"/>
  </g>`;

/* ---------- product plates ---------- */
export const plate = {
  // Whole-building box (Home Harmonizer / Booster / Device box)
  box: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <path d="M60 26 96 44v34L60 96 24 78V44z"/>
      <path d="M60 26 96 44 60 62 24 44z" fill="rgba(126,200,227,.10)"/>
      <path d="M60 62v34M24 44v34M96 44v34" opacity=".55"/>
    </g>` + wave(60, 46, 1)),

  // Room harmonizer — slimmer box
  room: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <rect x="38" y="30" width="44" height="60" rx="8"/>
      <rect x="46" y="40" width="28" height="24" rx="5" fill="rgba(126,200,227,.10)"/>
    </g>` + wave(60, 52, .9) + `<circle cx="60" cy="80" r="3.4" fill="url(#gg)"/>`),

  // Better ZZZ's — sleep pad with moon
  sleep: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <path d="M22 70 60 54 98 70 60 86z" fill="rgba(126,200,227,.08)"/>
      <path d="M22 70v8l38 16 38-16v-8"/>
    </g>
    <g stroke="url(#cg)" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M66 40a11 11 0 1 1-11-13 8 8 0 0 0 11 13z"/>
    </g>
    <g fill="url(#gg)" font-family="serif"><text x="74" y="34" font-size="10">z</text><text x="82" y="27" font-size="7">z</text></g>`),

  // Wrist band
  band: S(glow + `
    <g stroke="url(#gg)" stroke-width="3" fill="none">
      <ellipse cx="60" cy="60" rx="30" ry="34"/>
      <ellipse cx="60" cy="60" rx="30" ry="34" transform="rotate(0 60 60)" opacity=".0"/>
      <rect x="44" y="44" width="32" height="32" rx="10" fill="rgba(126,200,227,.10)"/>
    </g>` + wave(60, 60, .8)),

  // Band XL — thicker face
  bandxl: S(glow + `
    <g stroke="url(#gg)" stroke-width="3.2" fill="none">
      <ellipse cx="60" cy="60" rx="28" ry="36"/>
      <rect x="40" y="42" width="40" height="36" rx="12" fill="rgba(126,200,227,.12)"/>
    </g>` + wave(60, 60, .95) + `<path d="M40 60h-6M86 60h-6" stroke="url(#gg)" stroke-width="3" stroke-linecap="round"/>`),

  // Card
  card: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <rect x="26" y="34" width="68" height="46" rx="8" fill="rgba(126,200,227,.08)"/>
      <path d="M26 48h68" opacity=".6"/>
      <rect x="34" y="58" width="16" height="12" rx="3" fill="url(#gg)" opacity=".7" stroke="none"/>
    </g>` + wave(74, 64, .7)),

  // Phone chip (Cell Chip Ultra)
  phone: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <rect x="40" y="24" width="40" height="72" rx="10" fill="rgba(126,200,227,.08)"/>
      <path d="M52 30h16" stroke-linecap="round"/>
    </g>` + wave(60, 58, .8) + `<circle cx="60" cy="88" r="3" fill="url(#gg)"/>`),

  // iPhone MagSafe chip
  iphone: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <rect x="40" y="24" width="40" height="72" rx="11" fill="rgba(126,200,227,.08)"/>
    </g>
    <circle cx="60" cy="58" r="15" stroke="url(#cg)" stroke-width="2.6" fill="none" stroke-dasharray="4 4"/>
    <circle cx="60" cy="58" r="6" fill="url(#gg)"/>`),

  // Laptop chip
  laptop: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <path d="M34 40h52v30H34z" fill="rgba(126,200,227,.08)"/>
      <path d="M26 84h68l-6-14H32z"/>
    </g>` + wave(60, 54, .7)),

  // Router / device chip
  router: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <rect x="30" y="58" width="60" height="26" rx="7" fill="rgba(126,200,227,.08)"/>
      <path d="M44 58v-6M60 58v-10M76 58v-6" stroke-linecap="round"/>
      <circle cx="44" cy="52" r="2.4" fill="url(#gg)"/><circle cx="60" cy="48" r="2.4" fill="url(#gg)"/><circle cx="76" cy="52" r="2.4" fill="url(#gg)"/>
    </g>` + wave(60, 74, .6)),

  // Armored upgrade — chip with shield
  armor: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <path d="M60 24l26 10v22c0 20-14 32-26 38-12-6-26-18-26-38V34z" fill="rgba(126,200,227,.08)"/>
    </g>` + wave(60, 56, .8) + `<path d="M50 60l7 7 14-16" stroke="url(#gg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`),

  // Car harmonizer (plug)
  car: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.6" stroke-linejoin="round">
      <path d="M28 70l6-16c1-3 4-5 7-5h38c3 0 6 2 7 5l6 16v12H28z" fill="rgba(126,200,227,.08)"/>
      <circle cx="42" cy="82" r="6"/><circle cx="78" cy="82" r="6"/>
    </g>` + wave(60, 58, .7)),

  // Bundle — stacked pieces
  bundle: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.4" stroke-linejoin="round">
      <path d="M60 24 90 39v22L60 76 30 61V39z" fill="rgba(126,200,227,.10)"/>
      <path d="M60 24 90 39 60 54 30 39z"/>
      <ellipse cx="44" cy="90" rx="12" ry="8" fill="rgba(126,200,227,.06)"/>
      <rect x="66" y="82" width="22" height="16" rx="4" fill="rgba(126,200,227,.06)"/>
    </g>` + wave(60, 40, .8)),

  // Replacement face
  face: S(glow + `
    <g stroke="url(#gg)" stroke-width="2.8" fill="none">
      <rect x="40" y="40" width="40" height="40" rx="12" fill="rgba(126,200,227,.10)"/>
    </g>` + wave(60, 60, .9)),

  // Silicone strap
  silicone: S(glow + `
    <g stroke="url(#gg)" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M46 26c-8 14-8 54 0 68M74 26c8 14 8 54 0 68"/>
      <rect x="44" y="48" width="32" height="24" rx="8" fill="rgba(126,200,227,.10)"/>
    </g>`),

  // Nylon strap
  nylon: S(glow + `
    <g stroke="url(#gg)" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M40 30h40v14H40zM40 76h40v14H40z"/>
      <rect x="46" y="46" width="28" height="28" rx="8" fill="rgba(126,200,227,.10)"/>
      <path d="M44 33h32M44 87h32" stroke-width="1.4" opacity=".5"/>
    </g>` + wave(60, 60, .7)),
};

/* ---------- small UI icons (24x24 stroke) ---------- */
const U = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
export const icon = {
  home: U(`<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>`),
  moon: U(`<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>`),
  wrist: U(`<rect x="7" y="8" width="10" height="8" rx="3"/><path d="M8 8V5h8v3M8 16v3h8v-3"/>`),
  phone: U(`<rect x="7" y="2.5" width="10" height="19" rx="3"/><path d="M11 18h2"/>`),
  laptop: U(`<rect x="4" y="5" width="16" height="10" rx="2"/><path d="M2 19h20l-1.5-4H3.5z"/>`),
  router: U(`<rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 13v-2M16 13v-2M12 13v-3"/><path d="M7 8a7 7 0 0 1 10 0"/>`),
  car: U(`<path d="M5 15l1.5-5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1L19 15"/><path d="M4 15h16v3H4z"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/>`),
  shield: U(`<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>`),
  wave: U(`<path d="M4 12a8 8 0 0 1 16 0"/><path d="M7 12a5 5 0 0 1 10 0"/><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none"/>`),
  sparkle: U(`<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>`),
  check: U(`<path d="M4 12l5 5L20 6"/>`),
  arrow: U(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  leaf: U(`<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19c4-6 8-8 12-9"/>`),
  heart: U(`<path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5C19 15.5 12 20 12 20z"/>`),
  mail: U(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>`),
  call: U(`<path d="M4 5c0 9 6 15 15 15l1-4-4-2-2 2a11 11 0 0 1-6-6l2-2-2-4z"/>`),
  map: U(`<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>`),
  clock: U(`<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>`),
  gift: U(`<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 13h16M12 9v11"/><path d="M12 9C9 9 7 4 12 6c5-2 3 3 0 3z"/>`),
  chevron: U(`<path d="M9 6l6 6-6 6"/>`),
  star: U(`<path d="M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7z"/>`),
  bolt: U(`<path d="M13 3L5 13h6l-1 8 8-11h-6z"/>`),
  building: U(`<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>`),
  hotel: U(`<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-5h6v5"/><path d="M8 10h.5M15.5 10h.5"/>`),
};

/* hidden svg library for cart rendering (icon key -> plate svg) */
export function svgLib() {
  let out = '<div id="svg-lib" hidden aria-hidden="true">';
  for (const k in plate) out += `<div id="svg-${k}">${plate[k]}</div>`;
  return out + "</div>";
}
