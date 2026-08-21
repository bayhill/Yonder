import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import { clamp01, smoothstep } from '../../core/easing';

/**
 * The sky, computed rather than drawn as a gradient: a small buffer where every texel knows its
 * azimuth and elevation. Brightness rises toward the horizon, warmth gathers around the sun's
 * azimuth when it is low, and at twilight the opposite horizon carries the Belt of Venus over
 * the Earth's shadow. Redrawn only when the colours move a notch; upscaled smoothly.
 */
const BW = 128, BH = 64;
const SKY_BOTTOM = LAYOUT.horizonY + 12;
const hexToRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function createSky(): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = BW; canvas.height = BH;
  const cctx = canvas.getContext('2d')!;
  const img = cctx.createImageData(BW, BH);
  const px = img.data;
  let key = '';
  return {
    name: 'sky',
    static: true,
    draw(ctx, f: Frame) {
      const { vp, colours, light: L } = f;
      const top = Math.min(vp.top, 0) - 40;              // cover the sky from above the frame to the horizon
      const k = `${colours.version}|${Math.round(L.sunAzimuth)}|${Math.round(L.sunElevation * 2)}|${Math.round(top)}`;
      if (k !== key) {
        key = k;
        const zen = hexToRgb(colours.sky.zenith), mid = hexToRgb(colours.sky.mid), hor = hexToRgb(colours.sky.horizon);
        const glow = hexToRgb(colours.sky.glow), sunG = hexToRgb(colours.sky.sunGlow);
        const venus = hexToRgb(colours.sky.venus), shadow = hexToRgb(colours.sky.earthShadow);
        const sunAz = L.sunAzimuth, sunEl = L.sunElevation;
        const dSun = ((sunAz - 180 + 540) % 360) - 180;       // screen-x azimuth of the sun, -180..180
        const dAnti = ((sunAz + 360 - 180 + 540) % 360) - 180; // and of the anti-solar point
        const sunX = dSun / 90, antiX = dAnti / 90;           // in units of the sky mapping
        const glowAmt = L.sunGlow, venusAmt = L.venus;
        const flat = L.cloud;                                 // overcast flattens horizontal structure
        for (let j = 0; j < BH; j++) {
          const y = top + (j / (BH - 1)) * (SKY_BOTTOM - top);
          const el = (LAYOUT.horizonY - y) / 11;              // degrees above the horizon at this row
          const v = clamp01(1 - el / ((LAYOUT.horizonY - top) / 11)); // 0 at top of frame .. 1 at horizon
          // vertical base: zenith → mid → glow → horizon, like the old gradient but continuous
          let r: number, g: number, b: number;
          if (v < 0.55) { const t = v / 0.55; r = zen[0] + (mid[0] - zen[0]) * t; g = zen[1] + (mid[1] - zen[1]) * t; b = zen[2] + (mid[2] - zen[2]) * t; }
          else if (v < 0.9) { const t = (v - 0.55) / 0.35; r = mid[0] + (glow[0] - mid[0]) * t; g = mid[1] + (glow[1] - mid[1]) * t; b = mid[2] + (glow[2] - mid[2]) * t; }
          else { const t = (v - 0.9) / 0.1; r = glow[0] + (hor[0] - glow[0]) * t; g = glow[1] + (hor[1] - glow[1]) * t; b = glow[2] + (hor[2] - glow[2]) * t; }
          for (let i = 0; i < BW; i++) {
            const x = (i / (BW - 1)) * (WORLD.w + 400) - 200;
            const ax = (x - WORLD.w / 2) / (WORLD.w * 0.42);   // azimuth units, matches skyPoint
            let rr = r, gg = g, bb = b;
            // sun-side warmth: an angular falloff from the sun's position, widest near the horizon
            if (glowAmt > 0.005) {
              const dx = (ax - sunX) * 90, dy = el - Math.max(-4, sunEl);
              const ang = Math.hypot(dx * 0.55, dy);
              const w = glowAmt * (1 - smoothstep(0, 60 + 30 * L.twilightGlow, ang)) * (0.5 + 0.5 * v) * (1 - flat * 0.85);
              rr += (sunG[0] - rr) * w; gg += (sunG[1] - gg) * w; bb += (sunG[2] - bb) * w;
            }
            // anti-solar arch: rose band from ~3° to ~10°, blue-grey shadow below it
            if (venusAmt > 0.005) {
              const dx = Math.abs(ax - antiX) * 90;
              const across = 1 - smoothstep(30, 110, dx);
              const rise = -sunEl * 0.9;                       // the shadow climbs as the sun sinks
              const rose = smoothstep(rise - 1, rise + 2.5, el) * (1 - smoothstep(rise + 5, rise + 11, el));
              const dark = 1 - smoothstep(rise - 1.5, rise + 1.5, el);
              const wr = venusAmt * across * rose * 0.75, wd = venusAmt * across * dark * 0.8;
              rr += (venus[0] - rr) * wr; gg += (venus[1] - gg) * wr; bb += (venus[2] - bb) * wr;
              rr += (shadow[0] - rr) * wd; gg += (shadow[1] - gg) * wd; bb += (shadow[2] - bb) * wd;
            }
            const o = (j * BW + i) * 4;
            px[o] = rr; px[o + 1] = gg; px[o + 2] = bb; px[o + 3] = 255;
          }
        }
        cctx.putImageData(img, 0, 0);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, BW, BH, -200, top, WORLD.w + 400, SKY_BOTTOM - top);
    },
  };
}
