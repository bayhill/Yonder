import type { Layer, Frame } from '../layer';

/** Adds a polygon deformed by stem bending. `sArr` gives each vertex's height fraction; if null it is derived from `tree`. */
function bentPoly(ctx: CanvasRenderingContext2D, pts: Float32Array, sArr: Float32Array | null, tip: number, tree?: Tree): void {
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const s = sArr ? sArr[i] : Math.max(0, (tree!.y - pts[i * 2 + 1]) / tree!.trunkLen);
    const k = s * s;
    const x = pts[i * 2] + tip * k, y = pts[i * 2 + 1] + Math.abs(tip) * k * 0.18;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
import { generateTree, type Tree, type TreeSpec } from '../procgen/tree';
import type { Rng } from '../../core/random';
import { RAMP } from '../../colour/resolve';
import { Oscillator } from '../../core/smoothing';
import type { WindField, WindSample } from '../../wind/field';

/** A group of trees at a shared depth. Drawn back-to-front within the group. */
export function createTrees(specs: TreeSpec[], rng: Rng): Layer & { trees: Tree[] } {
  const trees = specs.map((s, i) => generateTree(s, rng.fork(`tree${i}`)));
  trees.sort((a, b) => b.depth - a.depth);

  // Per-tree motion: the stem is a lightly damped oscillator driven by the wind at the crown;
  // the canopy is a second, faster oscillator riding on the stem tip. Values are tip deflections in px.
  const stem = trees.map((t) => new Oscillator(0, t.kind === 'birch' ? 0.45 : 0.32, t.kind === 'birch' ? 0.32 : 0.4));
  const canopy = trees.map((t) => new Oscillator(0, t.kind === 'birch' ? 0.9 : 0.7, 0.45));
  const prevStem = new Float32Array(trees.length), prevCanopy = new Float32Array(trees.length);
  const shiver = new Float32Array(trees.length), prevShiver = new Float32Array(trees.length);
  const phase = trees.map((_, i) => i * 1.7);
  const ws: WindSample = { bend: 0, flutter: 0 };
  let t = 0;

  return {
    name: 'trees',
    trees,
    update(dt, _t, wind: WindField) {
      t += dt;
      for (let i = 0; i < trees.length; i++) {
        const tr = trees[i];
        prevStem[i] = stem[i].value; prevCanopy[i] = canopy[i].value; prevShiver[i] = shiver[i];
        wind.sample(tr.crownX, tr.crownY, ws);
        const birch = tr.kind === 'birch';
        // Steady-state tip deflection at full wind: birch ~7% of height, pine ~3%.
        const stemTarget = ws.bend * tr.height * (birch ? 0.07 : 0.03);
        stem[i].step(stemTarget, dt);
        // The canopy is pushed by the same wind but lags and overshoots the stem a little.
        canopy[i].step(ws.bend * tr.height * (birch ? 0.045 : 0.015), dt);
        const sh = ws.flutter * tr.height * (birch ? 0.012 : 0.003);
        shiver[i] = sh * (Math.sin(t * 11 + phase[i]) * 0.6 + Math.sin(t * 17.3 + phase[i] * 2) * 0.4);
      }
    },
    draw(ctx, f: Frame) {
      const c = f.colours;
      const dirX = f.light.dirX;
      const a = f.alpha;
      // Soft ground shadows first, so every trunk stands on its own shadow.
      const shadowAlpha = 0.22 * f.light.contrast;
      if (shadowAlpha > 0.01) {
        ctx.fillStyle = c.ramp('ground')[0];
        for (const t of trees) {
          if (t.depth > 0.35) continue;
          const len = Math.min(t.height * 1.4, t.height * 0.35 * f.light.shadowLength);
          const cx = t.x - dirX * len * 0.5, cy = t.y + 6;
          const g = ctx.createRadialGradient(t.x, cy, 0, cx, cy, len * 0.6);
          g.addColorStop(0, c.ramp('ground')[0]);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.globalAlpha = shadowAlpha;
          ctx.beginPath();
          ctx.ellipse(cx, cy, len * 0.6 + t.height * 0.08, t.height * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      for (let ti = 0; ti < trees.length; ti++) {
        const t = trees[ti];
        const far = t.depth > 0.35;
        const trunkCol = t.kind === 'birch' ? 'bark' : 'trunk';
        const tip = prevStem[ti] + (stem[ti].value - prevStem[ti]) * a;
        const cano = prevCanopy[ti] + (canopy[ti].value - prevCanopy[ti]) * a;
        const shv = prevShiver[ti] + (shiver[ti] - prevShiver[ti]) * a;
        // Cantilever bending: deflection grows with the square of height, and a bent stem
        // dips very slightly, so x += tip·s², y += |tip|·s²·0.18.
        ctx.fillStyle = far ? c.atmos(trunkCol, t.depth) : c.ramp(trunkCol)[2];
        ctx.beginPath();
        bentPoly(ctx, t.trunk, t.trunkS, tip);
        for (let bi = 0; bi < t.branches.length; bi++) bentPoly(ctx, t.branches[bi], t.branchS[bi], tip);
        ctx.fill();
        if (t.marks.length && !far) {
          ctx.fillStyle = c.ramp('trunk')[1];
          ctx.globalAlpha = 0.72;
          ctx.beginPath();
          for (const m of t.marks) bentPoly(ctx, m, null, tip, t);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Foliage, grouped by ramp index to minimise fillStyle changes.
        const role = t.kind === 'birch' ? 'foliageBirch' : 'foliage';
        const ramp = c.ramp(role);
        // Birch leaf masses shrink to twig clusters out of season; pines keep their needles.
        const leaf = t.kind === 'birch' ? f.season.leaf : 1;
        const sc = 0.38 + 0.62 * leaf;
        if (t.kind === 'birch') ctx.globalAlpha = 0.55 + 0.45 * leaf;
        for (let k = 0; k < RAMP; k++) {
          let any = false;
          ctx.beginPath();
          for (let bi = 0; bi < t.foliage.length; bi++) {
            const b = t.foliage[bi];
            const dx = (b as unknown as { dx: number }).dx ?? 0;
            const tone = b.tone * 0.8 + dx * dirX * 0.8 * f.light.contrast;
            const idx = Math.max(0, Math.min(RAMP - 1, Math.round(2 + tone * 1.6)));
            if (idx !== k) continue;
            any = true;
            // Foliage rides the bent stem, plus its own canopy motion (outer/higher blobs travel further).
            const sB = t.blobS[bi];
            const ox = tip * sB * sB + (cano + shv) * b.sway;
            const oy = Math.abs(ox) * 0.10;
            ctx.moveTo(b.x + ox + b.verts[0] * sc, b.y + oy + b.verts[1] * sc);
            for (let i = 2; i < b.verts.length; i += 2) ctx.lineTo(b.x + ox + b.verts[i] * sc, b.y + oy + b.verts[i + 1] * sc);
            ctx.closePath();
          }
          if (!any) continue;
          ctx.fillStyle = far ? c.atmos(role, t.depth + (k - 2) * -0.04) : ramp[k];
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}
