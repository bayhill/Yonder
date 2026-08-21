import type { Layer, Frame, FrameWeather } from '../scene/layer';
import { fitViewport, type Viewport } from '../scene/composition';
import type { Resolved } from '../colour/resolve';
import type { Light } from '../colour/light';
import type { SeasonParams } from '../colour/season';

export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly vp: Viewport;
  readonly dpr: number;
  resize(): void;
  render(colours: Resolved, light: Light, t: number, alpha: number, season: SeasonParams, weather: FrameWeather): void;
  /** Dev: ms spent per layer in the last profiled frame. */
  profile(colours: Resolved, light: Light, t: number): Record<string, number>;
}

const MAX_PIXELS = 3.5e6;

export function createRenderer(canvas: HTMLCanvasElement, layers: Layer[], maxDpr = 1.5): Renderer {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  // Every contiguous run of static layers is rendered once into its own offscreen canvas and
  // blitted; live layers in between draw every frame.
  type Pass = { kind: 'static'; layers: Layer[]; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; version: string } | { kind: 'live'; layer: Layer };
  const passes: Pass[] = [];
  for (const l of layers) {
    const last = passes[passes.length - 1];
    if (l.static) {
      if (last && last.kind === 'static') last.layers.push(l);
      else {
        const cv = document.createElement('canvas');
        passes.push({ kind: 'static', layers: [l], canvas: cv, ctx: cv.getContext('2d', { alpha: passes.length > 0 })!, version: '' });
      }
    } else passes.push({ kind: 'live', layer: l });
  }
  const vp = fitViewport(1, 1);
  let dpr = 1;
  const frame: Frame = { colours: null as unknown as Resolved, light: null as unknown as Light, vp, t: 0, alpha: 1, season: { leaf: 1, grass: 1, bloom: 0, fall: 0 }, weather: { rain: 0, snow: 0, temperature: 15, fog: 0, cloudCover: 0, snowCover: 0, wet: 0, frost: 0 }, dpr: 1 };

  function resize() {
    const fixed = new URLSearchParams(location.search).get('vp')?.split('x').map(Number);
    const cw = fixed?.[0] || window.innerWidth, ch = fixed?.[1] || window.innerHeight;
    if (fixed) { canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`; canvas.style.inset = 'auto'; canvas.style.margin = '0'; }
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (cw * ch)));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    for (const p of passes) if (p.kind === 'static') { p.canvas.width = canvas.width; p.canvas.height = canvas.height; p.version = ''; }
    fitViewport(cw, ch, vp);
    frame.dpr = dpr;
    for (const l of layers) l.resize?.(vp, dpr);
  }

  function render(colours: Resolved, light: Light, t: number, alpha: number, season: SeasonParams, weather: FrameWeather) {
    frame.colours = colours; frame.light = light; frame.t = t; frame.alpha = alpha; frame.season = season; frame.weather = weather;
    // Static passes re-render when colours change or when slow state they draw (snow, wet) moves a notch.
    const key = `${colours.version}|${Math.round(weather.snowCover * 60)}|${Math.round(weather.wet * 30)}`;
    for (const p of passes) {
      if (p.kind === 'static') {
        if (p.version !== key) {
          p.version = key;
          p.ctx.setTransform(1, 0, 0, 1, 0, 0);
          p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
          p.ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, vp.ox * dpr, vp.oy * dpr);
          for (const l of p.layers) l.draw(p.ctx, frame);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(p.canvas, 0, 0);
        ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, vp.ox * dpr, vp.oy * dpr);
      } else p.layer.draw(ctx, frame);
    }
  }

  function profile(colours: Resolved, light: Light, t: number) {
    frame.colours = colours; frame.light = light; frame.t = t; frame.alpha = 1;
    ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, vp.ox * dpr, vp.oy * dpr);
    const out: Record<string, number> = {};
    for (const l of layers) {
      const t0 = performance.now();
      l.draw(ctx, frame);
      out[l.name] = +(performance.now() - t0).toFixed(2);
    }
    return out;
  }

  window.addEventListener('resize', resize);
  resize();
  return { canvas, vp, get dpr() { return dpr; }, resize, render, profile };
}
