// The shared "dynamism DNA" for every dot-matrix element (background, bust,
// orb). Motion is carried by SIZE + OPACITY + COLOUR — not by moving dots far.
// An always-on field of overlapping waves gives each dot its own rhythm; the
// cursor only modulates it locally. See memory: dot-matrix-dna.

/** Always-on energy at a phase coordinate, 0..1. Three overlapping waves. */
export function wave(a: number, b: number, t: number): number {
  const w1 = Math.sin(a * 1.0 + b * 1.0 - t * 1.05);
  const w2 = Math.sin(a * 1.9 - b * 1.4 + t * 0.66);
  const w3 = Math.sin((a + b) * 0.6 + t * 0.4);
  return (w1 * 0.46 + w2 * 0.32 + w3 * 0.22) * 0.5 + 0.5;
}

const frac = (x: number) => x - Math.floor(x);
const hash1 = (n: number) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

/**
 * Per-dot CHAOTIC energy, 0..1. Each seed gets its own frequencies + phases, so
 * the field flickers independently (no coherent travelling wave). This is the
 * always-on base liveliness.
 */
export function chaos(seed: number, t: number): number {
  const f1 = 0.45 + hash1(seed) * 1.7;
  const p1 = hash1(seed + 1.7) * 6.2832;
  const f2 = 0.8 + hash1(seed + 5.3) * 2.6;
  const p2 = hash1(seed + 9.1) * 6.2832;
  const e = 0.5 + 0.37 * Math.sin(t * f1 + p1) + 0.31 * Math.sin(t * f2 + p2);
  return e < 0 ? 0 : e > 1 ? 1 : e;
}

export type RGB = [number, number, number];

export function mix(c1: RGB, c2: RGB, k: number): RGB {
  return [
    c1[0] + (c2[0] - c1[0]) * k,
    c1[1] + (c2[1] - c1[1]) * k,
    c1[2] + (c2[2] - c1[2]) * k,
  ];
}

/**
 * In-place linear mix of two colours into a caller-owned scratch tuple. Same
 * math as mix() but allocates nothing — the hot draw loops reuse one `out`
 * array per frame instead of minting a fresh RGB (and string) per dot. Returns
 * `out` for chaining.
 */
export function mixInto(out: RGB, c1: RGB, c2: RGB, k: number): RGB {
  out[0] = c1[0] + (c2[0] - c1[0]) * k;
  out[1] = c1[1] + (c2[1] - c1[1]) * k;
  out[2] = c1[2] + (c2[2] - c1[2]) * k;
  return out;
}

export function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

// Colour + alpha are quantized into a small fixed set of buckets so the draw
// loops assign ctx.fillStyle once per non-empty bucket (a few dozen) instead of
// once per dot, and the rgba() string for each bucket is built once and cached
// for the lifetime of the process. The steps are below perceptual threshold
// against the faint dot field — and alpha rounds UP (ceil) so any dot the
// callers already chose to draw never quantizes down to invisible.
const ALPHA_STEPS = 32; // alpha quantized to 1/32nds (6-bit)
const fillCache = new Map<number, string>();

/**
 * Quantize (integer r,g,b, alpha 0..1) to a stable bucket key. r/g/b are masked
 * to 5 bits each (32 levels); alpha to ALPHA_STEPS (6 bits), rounded up so a
 * visible dot never collapses to alpha 0. Identical inputs map to one key so
 * callers can batch fills per bucket. Bit layout: r<<17 | g<<12 | b<<6 | a.
 */
export function fillBucket(r: number, g: number, b: number, a: number): number {
  const rq = (r < 0 ? 0 : r > 255 ? 255 : r) >> 3;
  const gq = (g < 0 ? 0 : g > 255 ? 255 : g) >> 3;
  const bq = (b < 0 ? 0 : b > 255 ? 255 : b) >> 3;
  const aq = Math.ceil((a < 0 ? 0 : a > 1 ? 1 : a) * ALPHA_STEPS);
  return ((rq << 17) | (gq << 12) | (bq << 6) | aq) >>> 0;
}

/** Build (and cache) the rgba() string for a bucket key from fillBucket(). */
export function fillStyleForBucket(key: number): string {
  let s = fillCache.get(key);
  if (s !== undefined) return s;
  const aq = key & 0x3f;
  const bq = (key >> 6) & 0x1f;
  const gq = (key >> 12) & 0x1f;
  const rq = (key >> 17) & 0x1f;
  // de-quantize to channel midpoints (×8, +4) and alpha back to 0..1
  const r = (rq << 3) | 4;
  const g = (gq << 3) | 4;
  const b = (bq << 3) | 4;
  const a = aq / ALPHA_STEPS;
  s = `rgba(${r},${g},${b},${a})`;
  fillCache.set(key, s);
  return s;
}

/** smoothstep 0..1 */
export function smooth(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

// ── Impulse engine (the shared "jolt channel") ──────────────────────────────
// A module-level ring buffer that any surface can inject energy into — e.g. a
// CTA press sends a jolt that ripples through the dot field. Like everything in
// the DNA, a jolt only modulates SIZE + OPACITY + COLOUR: it is an expanding-
// then-fading ring of energy that the draw loops ADD on top of the chaotic base
// and the cursor lens. No dot ever moves. Coordinates are in viewport space
// (clientX/clientY); each canvas converts to its own local space before sampling.

// Each jolt remembers the viewport diagonal at emit time so its wavefront is
// scaled to reach EVERY screen edge within its life — the impulse is meant to
// be massive (a full-screen swell), not a small local hoop. `speed`/`width` are
// derived once at emit (no per-sample window reads in the hot loop).
type Jolt = {
  x: number;
  y: number;
  t0: number;
  strength: number;
  speed: number;
  width: number;
};

const JOLT_LIFE = 1.5; // seconds — a big wave needs room to cross the screen
const JOLT_WIDTH_FRAC = 0.42; // wavefront band as a fraction of the diagonal —
//                               broad swell of dots lights, not a thin hoop
const JOLT_RING_CAP = 8; // small fixed ring buffer (oldest overwritten)
const JOLT_DIAG_FALLBACK = 1600; // px, when window dims are unavailable

const jolts: Jolt[] = [];
let joltHead = 0;

/**
 * Inject an impulse into the shared dot field at viewport coords {x,y}. The
 * canvases pick it up on their next frame and render an expanding wave of energy
 * that sweeps the WHOLE viewport and settles within ~1.5s. A no-op under reduced
 * motion. `strength` (default 1) scales the peak energy.
 *
 * The ring's expansion speed + band width are scaled to the viewport diagonal at
 * emit time, so the wavefront reaches the far corner just as the jolt expires —
 * one big swell from the button across the entire screen, on any panel size.
 */
export function emitJolt({
  x,
  y,
  strength = 1,
}: {
  x: number;
  y: number;
  strength?: number;
}): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const diag =
    Math.hypot(window.innerWidth, window.innerHeight) || JOLT_DIAG_FALLBACK;
  // reach the farthest corner (the full diagonal) within the jolt's life, plus
  // a margin so the band has fully passed the edge before it expires.
  const speed = (diag * 1.15) / JOLT_LIFE;
  const width = diag * JOLT_WIDTH_FRAC;
  const j: Jolt = {
    x,
    y,
    t0: performance.now() / 1000,
    strength,
    speed,
    width,
  };
  if (jolts.length < JOLT_RING_CAP) {
    jolts.push(j);
  } else {
    jolts[joltHead] = j;
    joltHead = (joltHead + 1) % JOLT_RING_CAP;
  }
}

/**
 * Additive jolt energy at a point, 0..1+. `now` is the draw loop's seconds-since-
 * start; `wallNow` is performance.now()/1000 (jolt timestamps are wall-clock so
 * they survive RAF pauses). Each live jolt contributes an expanding-then-fading
 * wavefront: peak where |dist − speed·age| is small, decaying over the jolt's
 * life. The band is wide (≈half the diagonal) so a broad sweep of dots swells at
 * once rather than a clean thin hoop.
 */
export function sampleJolts(x: number, y: number, wallNow: number): number {
  let energy = 0;
  for (let k = 0; k < jolts.length; k++) {
    const j = jolts[k];
    const age = wallNow - j.t0;
    if (age < 0 || age >= JOLT_LIFE) continue;
    const d = Math.hypot(x - j.x, y - j.y);
    const front = j.speed * age;
    const ring = smooth(1 - Math.abs(d - front) / j.width);
    if (ring <= 0) continue;
    // ease-in then ease-out over life: a swell that grows, peaks mid-flight, and
    // settles back to the chaotic baseline as the front clears the screen.
    const fade = smooth(Math.sin((age / JOLT_LIFE) * Math.PI));
    energy += j.strength * ring * fade;
  }
  return energy;
}

/** Read an "r g b" CSS custom property into an RGB tuple. */
export function readRGBVar(name: string, fallback: RGB): RGB {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const p = v.split(/\s+/).map(Number);
  return p.length === 3 && p.every((n) => !Number.isNaN(n))
    ? (p as RGB)
    : fallback;
}
