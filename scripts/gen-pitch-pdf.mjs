// Export the /pitch deck to a 10-page PDF backup (the contingency if the live
// laptop fails on stage). Drives the locally-installed Google Chrome via
// puppeteer-core (no bundled browser download).
//
// Strategy: screenshot each of the 10 slides at 1280x720 (chrome hidden, after
// stepping to it so its canvases have painted) to temp PNGs, then assemble them
// into a 10-page landscape PDF via a file:// HTML page (one slide per page).
// Robust and fully faithful — independent of the deck's @media print quirks.
//
// Run:  npm i --no-save puppeteer-core && node scripts/gen-pitch-pdf.mjs
//   PITCH_URL overrides the target (default: the live deck).
// Output: public/socrates-ai-pitch.pdf

import { mkdtemp, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TARGET =
  process.env.PITCH_URL || "https://socrates-demo-chi.vercel.app/pitch";
const OUT = new URL("../public/socrates-ai-pitch.pdf", import.meta.url).pathname;
const W = 1280,
  H = 720,
  SLIDES = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const work = await mkdtemp(join(tmpdir(), "pitch-pdf-"));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  console.log("loading", TARGET);
  await page.goto(TARGET, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.addStyleTag({ content: ".deck-chrome{display:none !important}" });
  await page.bringToFront();
  await page.keyboard.press("Home");
  await sleep(700);

  const files = [];
  for (let i = 0; i < SLIDES; i++) {
    if (i > 0) await page.keyboard.press("ArrowRight");
    await sleep(950); // transition (700ms) + canvas paint
    const f = join(work, `slide-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({
      path: f,
      type: "png",
      clip: { x: 0, y: 0, width: W, height: H },
    });
    const kb = Math.round((await stat(f)).size / 1024);
    console.log(`  captured slide ${i + 1}/${SLIDES} (${kb}KB)`);
    files.push(f);
  }

  // assemble: a file:// HTML page, one full-bleed image per landscape page
  const html = `<!doctype html><html><head><meta charset="utf8"><style>
    *{margin:0;padding:0}
    @page{size:${W}px ${H}px;margin:0}
    html,body{background:#0b1220}
    img{display:block;width:${W}px;height:${H}px}
    .pg{break-after:page;page-break-after:always}
    .pg:last-child{break-after:auto;page-break-after:auto}
  </style></head><body>${files
    .map((f) => `<img class="pg" src="file://${f}">`)
    .join("")}</body></html>`;
  const htmlPath = join(work, "deck.html");
  await writeFile(htmlPath, html);

  const out = await browser.newPage();
  await out.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
  await out.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await out.pdf({
    path: OUT,
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
    pageRanges: "",
  });
  console.log("wrote", OUT);
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
