import type { Rng } from '../../core/random';

/** A soft foliage mass: an irregular polygon around (x, y), stored as relative vertices. */
export interface Blob {
  x: number; y: number;
  verts: Float32Array;    // [dx0, dy0, dx1, dy1, ...]
  /** -1 shade .. +1 light, relative to the canopy and the light direction. */
  tone: number;
  /** 0..1 how much this blob sways (outer, higher canopy sways more). */
  sway: number;
}

export interface Tree {
  kind: 'birch' | 'pine';
  x: number; y: number;     // base of trunk
  height: number;
  depth: number;            // 0 near .. 1 far (atmosphere)
  trunk: Float32Array;      // closed polygon, absolute coords
  branches: Float32Array[]; // closed polygons
  foliage: Blob[];          // drawn back-to-front as generated
  /** Horizontal offset of the canopy centre from the trunk base — used for tone. */
  crownX: number; crownY: number;
}

export interface TreeSpec {
  kind: 'birch' | 'pine';
  x: number; y: number; height: number; depth: number;
  lean?: number;  // -1..1
}

/** Polygon for a tapered, gently curving limb from (x0,y0) in direction `angle` (radians, 0 = up). */
function limb(
  x0: number, y0: number, len: number, angle: number, w0: number, w1: number,
  curve: number, rng: Rng, segments = 8,
): { poly: Float32Array; tip: [number, number]; along: (t: number) => [number, number, number] } {
  const cx: number[] = [], cy: number[] = [], ca: number[] = [];
  let x = x0, y = y0, a = angle;
  for (let i = 0; i <= segments; i++) {
    cx.push(x); cy.push(y); ca.push(a);
    const step = len / segments;
    x += Math.sin(a) * step;
    y -= Math.cos(a) * step;
    a += curve / segments + rng.gauss() * 0.035;
  }
  const poly = new Float32Array((segments + 1) * 4);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = (w0 + (w1 - w0) * t) * 0.5;
    const nx = Math.cos(ca[i]), ny = Math.sin(ca[i]);
    // left edge going up
    poly[i * 2] = cx[i] - nx * w;
    poly[i * 2 + 1] = cy[i] - ny * w;
    // right edge coming back down
    const j = (segments + 1) + (segments - i);
    poly[j * 2] = cx[i] + nx * w;
    poly[j * 2 + 1] = cy[i] + ny * w;
  }
  return {
    poly,
    tip: [cx[segments], cy[segments]],
    along: (t) => {
      const f = t * segments, i = Math.min(segments - 1, Math.floor(f)), u = f - i;
      return [cx[i] + (cx[i + 1] - cx[i]) * u, cy[i] + (cy[i + 1] - cy[i]) * u, ca[i]];
    },
  };
}

function blob(rx: number, ry: number, rng: Rng, n = 18, rough = 0.16): Float32Array {
  const verts = new Float32Array(n * 2);
  const p1 = rng.range(0, Math.PI * 2), p2 = rng.range(0, Math.PI * 2);
  const a1 = rng.range(0.5, 1), a2 = rng.range(0.3, 0.8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = 1 + rough * (a1 * Math.sin(a * 2 + p1) * 0.5 + a2 * Math.sin(a * 3 + p2) * 0.35 + rng.gauss() * 0.12);
    verts[i * 2] = Math.cos(a) * rx * m;
    verts[i * 2 + 1] = Math.sin(a) * ry * m;
  }
  return verts;
}

export function generateTree(spec: TreeSpec, rng: Rng): Tree {
  return spec.kind === 'birch' ? birch(spec, rng) : pine(spec, rng);
}

function birch(spec: TreeSpec, rng: Rng): Tree {
  const H = spec.height;
  const lean = (spec.lean ?? rng.range(-0.5, 0.5)) * 0.12;
  const trunk = limb(spec.x, spec.y, H * 0.82, lean, H * 0.036, H * 0.008, rng.range(-0.10, 0.10), rng, 10);
  const branches: Float32Array[] = [];
  const foliage: Array<Blob & { dx: number }> = [];
  // Leaf-bearing twig ends: x, y, size, and how "outer" they are (0 inner .. 1 outer)
  const tips: Array<[number, number, number, number]> = [];

  const nBranch = rng.int(7, 10);
  let side = rng.chance(0.5) ? 1 : -1;
  for (let i = 0; i < nBranch; i++) {
    const t = 0.40 + (i / (nBranch - 1)) * 0.58 + rng.gauss() * 0.02;
    const [bx, by, ba] = trunk.along(Math.min(0.99, t));
    side = rng.chance(0.7) ? -side : side;
    const upness = 1 - t;
    // Birch branches rise, then the fine twigs weep. Upper branches are steeper.
    const ang = ba + side * (0.45 + upness * 0.75 + rng.gauss() * 0.12);
    const len = H * (0.14 + upness * 0.30) * rng.range(0.8, 1.15);
    const b = limb(bx, by, len, ang, H * 0.012 * (1 - t * 0.4) + 1, 0.5, -side * 0.25 + 0.0, rng, 6);
    branches.push(b.poly);
    // 1–2 sub-branches
    const subs = rng.int(1, 2);
    for (let q = 0; q < subs; q++) {
      const u = rng.range(0.35, 0.75);
      const [sx, sy, sa] = b.along(u);
      const sl = len * rng.range(0.3, 0.5);
      const s2 = limb(sx, sy, sl, sa + side * rng.range(-0.2, 0.6) * (q ? -1 : 1), 1.4, 0.4, rng.range(-0.3, 0.3), rng, 4);
      branches.push(s2.poly);
      for (let k = 0; k < 3; k++) {
        const [fx, fy] = s2.along(rng.range(0.3, 1));
        tips.push([fx, fy, 0.8, 0.6 + 0.4 * u]);
      }
    }
    // Leaf clusters hang along the outer half of the branch
    const n = rng.int(4, 6);
    for (let k = 0; k < n; k++) {
      const u = rng.range(0.45, 1);
      const [fx, fy] = b.along(u);
      tips.push([fx, fy, 0.85 + upness * 0.3, u]);
    }
  }
  const top = trunk.tip;
  for (let k = 0; k < 5; k++) tips.push([top[0] + rng.gauss() * H * 0.05, top[1] + rng.range(-0.02, 0.08) * H, 1.0, 1]);

  let cxs = 0, cys = 0;
  for (const [x, y] of tips) { cxs += x; cys += y; }
  const crownX = cxs / tips.length, crownY = cys / tips.length;
  const crownR = H * 0.32;

  for (const [tx, ty, sz, outer] of tips) {
    // Each twig end carries a short weeping strand of small leaf masses.
    const n = rng.int(3, 6);
    const strandX = rng.gauss() * H * 0.012;
    const strandLen = H * rng.range(0.04, 0.11) * sz;
    for (let k = 0; k < n; k++) {
      const u = k / Math.max(1, n - 1);
      const r = H * rng.range(0.012, 0.026) * sz * (1 - u * 0.3);
      const x = tx + strandX * u + rng.gauss() * r * 0.8;
      const y = ty + strandLen * u + rng.gauss() * r * 0.4;
      const dx = (x - crownX) / crownR, dy = (y - crownY) / crownR;
      const tone = -dy * 0.6 + outer * 0.3 - u * 0.25 - 0.05 + rng.gauss() * 0.45;
      foliage.push({ x, y, verts: blob(r * rng.range(1.0, 1.5), r * rng.range(0.8, 1.1), rng, 12, 0.35), tone, sway: Math.min(1, 0.35 + Math.hypot(dx, dy) * 0.65), dx });
    }
  }
  foliage.sort((a, b) => a.tone - b.tone);
  return { kind: 'birch', x: spec.x, y: spec.y, height: H, depth: spec.depth, trunk: trunk.poly, branches, foliage, crownX, crownY };
}

function pine(spec: TreeSpec, rng: Rng): Tree {
  const H = spec.height;
  const lean = (spec.lean ?? rng.range(-0.3, 0.3)) * 0.07;
  const trunk = limb(spec.x, spec.y, H * 0.94, lean, H * 0.032, H * 0.007, rng.range(-0.05, 0.05), rng, 10);
  const branches: Float32Array[] = [];
  const foliage: Array<Blob & { dx: number }> = [];
  // Scots pine: a long bare trunk and an open, irregular crown in the top third.
  const bare = rng.range(0.52, 0.62);
  const tiers = rng.int(5, 7);
  let crownX = 0, crownY = 0, count = 0;
  for (let i = 0; i < tiers; i++) {
    const t = bare + (i / (tiers - 1)) * (0.96 - bare);
    const [bx, by, ba] = trunk.along(t);
    const taper = 1 - (i / (tiers - 1)) * 0.7;
    const sides = rng.chance(0.3) ? [rng.chance(0.5) ? -1 : 1] : [-1, 1];
    for (const side of sides) {
      const len = H * (0.12 + 0.20 * taper) * rng.range(0.55, 1.25);
      // Branches reach out nearly level, sag, and lift again at the tip.
      const ang = ba + side * (Math.PI / 2 - 0.25 + rng.range(-0.15, 0.2));
      const b = limb(bx, by, len, ang, H * 0.010 * taper + 1, 0.7, -side * rng.range(0.15, 0.35), rng, 5);
      branches.push(b.poly);
      // Flat needle pads: wide, thin, ragged underneath; bigger toward the tip.
      const pads = rng.int(2, 4);
      for (let k = 0; k < pads; k++) {
        const u = (k + rng.range(0.4, 1)) / pads;
        const [px, py] = b.along(Math.min(1, u));
        const w = len * (0.26 + 0.22 * u) * rng.range(0.8, 1.15);
        const x = px + side * w * 0.1, y = py - w * 0.12;
        foliage.push({ x, y, verts: blob(w, w * rng.range(0.28, 0.4), rng, 16, 0.38), tone: 0.15 - (i / tiers) * 0.1 - u * 0.1 + rng.gauss() * 0.3, sway: 0.2 + 0.4 * u, dx: side * (0.4 + u * 0.6) });
        crownX += x; crownY += y; count++;
      }
    }
  }
  const top = trunk.tip;
  foliage.push({ x: top[0], y: top[1] + H * 0.015, verts: blob(H * 0.045, H * 0.03, rng, 12, 0.35), tone: 0.35, sway: 0.8, dx: 0 });
  foliage.sort((a, b) => a.tone - b.tone);
  return { kind: 'pine', x: spec.x, y: spec.y, height: H, depth: spec.depth, trunk: trunk.poly, branches, foliage, crownX: crownX / Math.max(1, count), crownY: crownY / Math.max(1, count) };
}
