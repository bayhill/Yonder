import type { Layer, Frame } from '../layer';
import { fillPoly } from '../layer';
import { generateTree, type Tree, type TreeSpec } from '../procgen/tree';
import type { Rng } from '../../core/random';
import { RAMP } from '../../colour/resolve';

/** A group of trees at a shared depth. Drawn back-to-front within the group. */
export function createTrees(specs: TreeSpec[], rng: Rng): Layer & { trees: Tree[] } {
  const trees = specs.map((s, i) => generateTree(s, rng.fork(`tree${i}`)));
  trees.sort((a, b) => b.depth - a.depth);

  return {
    name: 'trees',
    trees,
    draw(ctx, f: Frame) {
      const c = f.colours;
      const dirX = f.light.dirX;
      for (const t of trees) {
        const far = t.depth > 0.35;
        const trunkCol = t.kind === 'birch' ? 'bark' : 'trunk';
        // Trunk + branches
        ctx.fillStyle = far ? c.atmos(trunkCol, t.depth) : c.ramp(trunkCol)[2];
        ctx.beginPath();
        fillPoly(ctx, t.trunk);
        for (const b of t.branches) fillPoly(ctx, b);
        ctx.fill();
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
            ctx.moveTo(b.x + b.verts[0], b.y + b.verts[1]);
            for (let i = 2; i < b.verts.length; i += 2) ctx.lineTo(b.x + b.verts[i], b.y + b.verts[i + 1]);
            ctx.closePath();
          }
          if (!any) continue;
          ctx.fillStyle = far ? c.atmos(role, t.depth + (k - 2) * -0.04) : ramp[k];
          ctx.fill();
        }
      }
    },
  };
}
