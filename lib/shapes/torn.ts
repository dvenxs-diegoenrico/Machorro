/** Deterministic torn-paper clip-paths, so server and client render the same edges. */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (n: number) => `${n.toFixed(2)}%`;

/** A rectangle with all four edges roughly torn. `depth` is the max bite in %. */
export function tornEdges(seed: number, depth = 2.2): string {
  const rand = mulberry32(seed);
  const points: string[] = [];
  const walk = (emit: (along: number, bite: number) => string) => {
    let along = 0;
    while (along < 100) {
      points.push(emit(along, rand() * depth));
      along += 3 + rand() * 5;
    }
  };
  walk((x, b) => `${pct(x)} ${pct(b)}`); // top, left → right
  walk((y, b) => `${pct(100 - b)} ${pct(y)}`); // right, top → bottom
  walk((x, b) => `${pct(100 - x)} ${pct(100 - b)}`); // bottom, right → left
  walk((y, b) => `${pct(b)} ${pct(100 - y)}`); // left, bottom → top
  return `polygon(${points.join(", ")})`;
}

/** A ticket: straight top and bottom, zigzag perforation on both ends. */
export function ticketEdges(teeth = 5, bite = 2.2): string {
  const points: string[] = [];
  const step = 100 / (teeth * 2);
  for (let i = 0; i <= teeth * 2; i++) {
    points.push(`${pct(100 - (i % 2 ? bite : 0))} ${pct(i * step)}`);
  }
  for (let i = teeth * 2; i >= 0; i--) {
    points.push(`${pct(i % 2 ? bite : 0)} ${pct(i * step)}`);
  }
  return `polygon(${points.join(", ")})`;
}

export type Point = readonly [number, number];

/**
 * A hand-ripped outline. Takes a loose polygon drawn around a figure (in image pixels),
 * breaks every edge into short tears and nudges each one, so it reads as torn paper.
 * Returns points as % of the bounding box plus the box itself (in image pixels).
 */
export function ripOutline(points: readonly Point[], seed: number, roughness = 5, pad = 6) {
  const rand = mulberry32(seed);
  const torn: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.round(len / 22));
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const j = s === 0 ? 0 : (rand() - 0.5) * 2 * roughness;
      torn.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j]);
    }
  }
  const xs = torn.map((p) => p[0]);
  const ys = torn.map((p) => p[1]);
  const box = {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };
  return { torn, box };
}

/** A starburst sticker outline, as an SVG points string in a 100×100 box. */
export function burstPoints(spikes = 14, inner = 38, outer = 50): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}
