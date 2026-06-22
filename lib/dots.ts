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

export function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

/** smoothstep 0..1 */
export function smooth(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
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
