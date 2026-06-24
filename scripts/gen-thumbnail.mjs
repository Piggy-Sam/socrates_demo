// Generate project thumbnails (LIGHT mode) from the Socrates dot-matrix face.
//   • thumbnail-wordmark.(svg|png) — the face + the "SOCRATES AI" wordmark
//   • thumbnail-face.(svg|png)     — the face alone
// Saved to ./public. Run: node scripts/gen-thumbnail.mjs
//
// The face is drawn from BUST_FACE (the same density grid the landing hero
// samples), so it matches the brand exactly. Rasterized with sharp.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

// ── brand tokens (light mode) ────────────────────────────────────────────────
const INK = "#F4F6FA"; // paper
const MARBLE = "#0B0F1A"; // near-black text / face dots
const MARBLE_DIM = "#5A6678"; // muted
const ACCENT = "#0F62FE"; // the one profound blue

// ── load the face density grid from components/brand/bust-dots.ts ────────────
const src = await readFile(
  new URL("../components/brand/bust-dots.ts", import.meta.url),
  "utf8",
);
const faceMatch = src.match(/BUST_FACE[^=]*=\s*(\{.*?\})\s*;/s);
if (!faceMatch) throw new Error("Could not parse BUST_FACE from bust-dots.ts");
const FACE = JSON.parse(faceMatch[1]); // { w, h, d:number[] }

// One <g> of circles for the face, in a `scale`-px-per-cell coordinate space,
// translated to (ox, oy). Dot size + opacity track the cell intensity, exactly
// like the hero field — dark marble dots on light paper.
function faceGroup(scale, ox, oy) {
  const { w, h, d } = FACE;
  const out = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const v = d[r * w + c];
      if (!v || v < 0.07) continue;
      const cx = (c + 0.5) * scale + ox;
      const cy = (r + 0.5) * scale + oy;
      const rad = (0.1 + 0.42 * v) * scale;
      const op = (0.28 + 0.72 * v).toFixed(3);
      out.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(2)}" fill="${MARBLE}" fill-opacity="${op}"/>`,
      );
    }
  }
  return out.join("");
}

const faceW = (s) => FACE.w * s;
const faceH = (s) => FACE.h * s;

// ── thumbnail 1: face + wordmark (1200 x 630) ────────────────────────────────
function wordmarkSvg() {
  const W = 1200,
    H = 760; // taller canvas → more room top + bottom
  const s = 9.4; // px per cell → ~470px tall face
  const ox = 78,
    oy = (H - faceH(s)) / 2;
  const tx = ox + faceW(s) + 70; // text left edge (~560)
  const mono =
    "ui-monospace, 'SFMono-Regular', Menlo, 'DejaVu Sans Mono', monospace";
  // approximate mono advance so we can place the cursor block right after "AI"
  const wm = 70;
  const adv = wm * 0.6 + 4; // glyph advance incl. letter-spacing
  const aiGap = 22;
  const wordmarkW = 8 * adv + aiGap + 2 * adv; // SOCRATES + gap + AI
  // shift the text block down with the (vertically-centred) face
  const dy = (H - 630) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <g>${faceGroup(s, ox, oy)}</g>
  <text x="${tx}" y="${246 + dy}" font-family="${mono}" font-size="15" letter-spacing="3" fill="${MARBLE_DIM}">&#8250; AN INSTRUMENT FOR THE EXAMINED LIFE</text>
  <text x="${tx}" y="${316 + dy}" font-family="${mono}" font-size="${wm}" font-weight="600" letter-spacing="4" fill="${MARBLE}">SOCRATES<tspan dx="${aiGap}" fill="${ACCENT}">AI</tspan></text>
  <rect x="${(tx + wordmarkW + 8).toFixed(0)}" y="${266 + dy}" width="30" height="54" fill="${ACCENT}"/>
  <text x="${tx}" y="${392 + dy}" font-family="${mono}" font-size="27" letter-spacing="0.5" fill="${MARBLE}">AI that sharpens your thinking</text>
  <text x="${tx}" y="${432 + dy}" font-family="${mono}" font-size="27" letter-spacing="0.5" fill="${MARBLE}">instead of replacing it.</text>
</svg>`;
}

// ── thumbnail 2: face only — square (1000 x 1000), face fills it ─────────────
function faceOnlySvg() {
  const W = 1000,
    H = 1000;
  const s = 16.6; // ~830px tall face
  const ox = (W - faceW(s)) / 2,
    oy = (H - faceH(s)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <g>${faceGroup(s, ox, oy)}</g>
</svg>`;
}

// ── write SVG + PNG ──────────────────────────────────────────────────────────
const outDir = new URL("../public/", import.meta.url);
await mkdir(outDir, { recursive: true });

async function emit(name, svg) {
  const svgPath = new URL(`./${name}.svg`, outDir);
  const pngPath = new URL(`./${name}.png`, outDir);
  await writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath.pathname);
  const meta = await sharp(pngPath.pathname).metadata();
  const stats = await sharp(pngPath.pathname).stats();
  const stdev = stats.channels.map((c) => c.stdev.toFixed(1)).join("/");
  console.log(`  ${name}.png  ${meta.width}x${meta.height}  rgb-stdev=${stdev}`);
  return pngPath.pathname;
}

console.log("generating thumbnails →");
const wm = await emit("thumbnail-wordmark", wordmarkSvg());
await emit("thumbnail-face", faceOnlySvg());

// Verify the wordmark TEXT actually rasterized (sharp's renderer can drop fonts):
// sample the text band and check for dark (text) pixels against the light paper.
const band = await sharp(wm)
  .extract({ left: 600, top: 250, width: 560, height: 90 })
  .stats();
const darkEnough = band.channels[0].min < 120; // any near-black text pixel?
console.log(
  `  wordmark text check: ${darkEnough ? "TEXT RENDERED ✓" : "NO TEXT — font not found ✗"} (min channel ${band.channels[0].min})`,
);
console.log("done. files in ./public");
