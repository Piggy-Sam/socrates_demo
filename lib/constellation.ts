// The constellation of your mind — turning entries into a stable night sky.
// Each entry is a star with a FIXED position (derived from its id) so the sky
// only ever grows; recurring themes draw the constellation lines between stars.

export type EntryType =
  | "idea"
  | "opinion"
  | "feeling"
  | "observation"
  | "question"
  | "decision";

export type SkyStar = {
  id: string;
  type: EntryType;
  content: string;
  themes?: string[];
  /** 0..1 — recency or recurrence; drives size + brightness */
  brightness?: number;
  createdAt?: string;
};

export type PlacedStar = SkyStar & {
  x: number; // 0..100 (viewBox units)
  y: number; // 0..100
  r: number; // radius in viewBox units
  mag: number; // 0..1 brightness, clamped
};

export type ThemeLink = {
  theme: string;
  a: string; // star id
  b: string; // star id
};

// deterministic 32-bit hash (FNV-1a) — stable positions across renders/sessions
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// two independent unit values from one id
function placeUnit(id: string): [number, number] {
  const a = hash(id);
  const b = hash(id + "·sky");
  return [a / 0xffffffff, b / 0xffffffff];
}

export type LayoutOpts = {
  /** inset from the edges, in viewBox units (keeps stars off the frame) */
  pad?: number;
};

/**
 * Place stars deterministically. We bias the vertical distribution slightly so
 * the sky feels like a sky (denser high, sparser low) and keep stars off the
 * frame edges. Position depends only on the entry id — the field is stable as
 * the bank grows.
 */
export function layoutStars(
  stars: SkyStar[],
  { pad = 7 }: LayoutOpts = {},
): PlacedStar[] {
  const span = 100 - pad * 2;
  return stars.map((s) => {
    const [u, v] = placeUnit(s.id);
    const x = pad + u * span;
    // gentle gamma on v pulls a few more stars upward — sky, not grid
    const y = pad + Math.pow(v, 1.15) * span;
    const mag = clamp01(s.brightness ?? 0.55);
    const r = 0.5 + mag * 1.3;
    return { ...s, x, y, r, mag };
  });
}

/**
 * Draw constellation lines from shared themes. Within each theme, stars are
 * connected nearest-neighbour into a single path (a real constellation shape),
 * not a dense clique — calm, legible, structural.
 */
export function themeLinks(placed: PlacedStar[]): ThemeLink[] {
  const byTheme = new Map<string, PlacedStar[]>();
  for (const star of placed) {
    for (const theme of star.themes ?? []) {
      const arr = byTheme.get(theme) ?? [];
      arr.push(star);
      byTheme.set(theme, arr);
    }
  }

  const links: ThemeLink[] = [];
  for (const [theme, group] of byTheme) {
    if (group.length < 2) continue;
    // greedy nearest-neighbour path, seeded from the brightest star
    const remaining = [...group].sort((a, b) => b.mag - a.mag);
    let current = remaining.shift()!;
    while (remaining.length) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = dist2(current, remaining[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      links.push({ theme, a: current.id, b: next.id });
      current = next;
    }
  }
  return links;
}

function dist2(a: PlacedStar, b: PlacedStar) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export const TYPE_GLYPH: Record<EntryType, string> = {
  idea: "✦",
  opinion: "◆",
  feeling: "❍",
  observation: "·",
  question: "?",
  decision: "▲",
};
