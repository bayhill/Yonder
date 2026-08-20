import { LAYOUT, WORLD } from './composition';

/**
 * Maps a compass azimuth / elevation to a point in world space.
 * The camera looks roughly south with a wide field of view, so east sits past the left edge
 * and west past the right; elevation rises the point above the horizon.
 */
export function skyPoint(azimuth: number, elevation: number, out: { x: number; y: number }) {
  let d = ((azimuth - 180 + 540) % 360) - 180; // -180..180, 0 = due south
  out.x = WORLD.w / 2 + (d / 90) * WORLD.w * 0.42;
  out.y = LAYOUT.horizonY - elevation * 11;
  return out;
}
