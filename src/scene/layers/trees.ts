import type { Layer, Frame } from '../layer';
import { fillPoly } from '../layer';
import { generateTree, type Tree, type TreeSpec } from '../procgen/tree';
import type { Rng } from '../../core/random';
import { RAMP } from '../../colour/resolve';
import { Spring } from '../../core/smoothing';
import type { WindField, WindSample } from '../../wind/field';

/** A group of trees at a shared depth. Drawn back-to-front within the group. */
export function createTrees(specs: TreeSpec[], rng: Rng): Layer & { trees: Tree[] } {
  const trees = specs.map((s, i) => generateTree(s, rng.fork(`tree${i}`)));
  trees.sort((a, b) => b.depth - a.depth);

  // Per-tree motion state: trunk lean (radians) and canopy displacement (world px), smoothed by springs.
  const trunk = trees.map(() => new Spring(0, 1.6));
  const canopy = trees.map(() => new Spring(0, 3.2));
  const prevTrunk = new Float32Array(trees.length), prevCanopy = new Float32Array(trees.length);
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
        prevTrunk[i] = trunk[i].value; prevCanopy[i] = canopy[i].value; prevShiver[i] = shiver[i];
        wind.sample(tr.crownX, tr.crownY, ws);
        const birch = tr.kind === 'birch';
        // Pines are stiff; birches bend more at the trunk and much more in the canopy.
        trunk[i].step(ws.bend * (birch ? 0.028 : 0.011), dt);
        canopy[i].step(ws.bend * tr.height * (birch ? 0.055 : 0.022), dt);
        // Birches shiver at higher frequency in strong wind; pines barely.
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
        const lean = prevTrunk[ti] + (trunk[ti].value - prevTrunk[ti]) * a;
        const cano = prevCanopy[ti] + (canopy[ti].value - prevCanopy[ti]) * a;
        const shv = prevShiver[ti] + (shiver[ti] - prevShiver[ti]) * a;
        // The whole tree rotates a little about its base; the canopy adds its own displacement.
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(lean);
        ctx.translate(-t.x, -t.y);
        // Trunk + branches
        ctx.fillStyle = far ? c.atmos(trunkCol, t.depth) : c.ramp(trunkCol)[2];
        ctx.beginPath();
        fillPoly(ctx, t.trunk);
        for (const b of t.branches) fillPoly(ctx, b);
        ctx.fill();
        if (t.marks.length && !far) {
          ctx.fillStyle = c.ramp('trunk')[1];
          ctx.globalAlpha = 0.72;
          ctx.beginPath();
          for (const m of t.marks) fillPoly(ctx, m);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Foliage, grouped by ramp index to minimise fillStyle changes.
        const role = t.kind === 'birch' ? 'foliageBirch' : 'foliage';
        const ramp = c.ramp(role);
        for (let k = 0; k < RAMP; k++) {
          let any = false;
          ctx.beginPath();
          for (const b of t.foliage) {
            const dx = (b as unknown as { dx: number }).dx ?? 0;
            const tone = b.tone * 0.8 + dx * dirX * 0.8 * f.light.contrast;
            const idx = Math.max(0, Math.min(RAMP - 1, Math.round(2 + tone * 1.6)));
            if (idx !== k) continue;
            any = true;
            // Outer, higher foliage travels further; each blob also sags a touch when pushed.
            const ox = (cano + shv) * b.sway;
            const oy = Math.abs(ox) * 0.12;
            ctx.moveTo(b.x + ox + b.verts[0], b.y + oy + b.verts[1]);
            for (let i = 2; i < b.verts.length; i += 2) ctx.lineTo(b.x + ox + b.verts[i], b.y + oy + b.verts[i + 1]);
            ctx.closePath();
          }
          if (!any) continue;
          ctx.fillStyle = far ? c.atmos(role, t.depth + (k - 2) * -0.04) : ramp[k];
          ctx.fill();
        }
        ctx.restore();
      }
    },
  };
}
