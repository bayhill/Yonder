import type { Layer, Frame } from '../scene/layer';
import { fitViewport, type Viewport } from '../scene/composition';
import type { Resolved } from '../colour/resolve';
import type { Light } from '../colour/light';

export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly vp: Viewport;
  readonly dpr: number;
  resize(): void;
  render(colours: Resolved, light: Light, t: number): void;
  /** Dev: ms spent per layer in the last profiled frame. */
  profile(colours: Resolved, light: Light, t: number): Record<string, number>;
}

const MAX_PIXELS = 3.5e6;

export function createRenderer(canvas: HTMLCanvasElement, layers: Layer[], maxDpr = 1.5): Renderer {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  // Leading run of static layers is rendered once into an offscreen canvas and blitted.
  let nStatic = 0;
  while (nStatic < layers.length && layers[nStatic].static) nStatic++;
  const staticLayers = layers.slice(0, nStatic);
  const liveLayers = layers.slice(nStatic);
  const back = document.createElement('canvas');
  const bctx = back.getContext('2d', { alpha: false })!;
  let backVersion = -1;
  const vp = fitViewport(1, 1);
  let dpr = 1;
  const frame: Frame = { colours: null as unknown as Resolved, light: null as unknown as Light, vp, t: 0, dpr: 1 };

  function resize() {
    const fixed = new URLSearchParams(location.search).get('vp')?.split('x').map(Number);
    const cw = fixed?.[0] || window.innerWidth, ch = fixed?.[1] || window.innerHeight;
    if (fixed) { canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`; canvas.style.inset = 'auto'; canvas.style.margin = '0'; }
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (cw * ch)));
    canvas.width = back.width = Math.round(cw * dpr);
    canvas.height = back.height = Math.round(ch * dpr);
    backVersion = -1;
    fitViewport(cw, ch, vp);
    frame.dpr = dpr;
    for (const l of layers) l.resize?.(vp, dpr);
  }

  function render(colours: Resolved, light: Light, t: number) {
    frame.colours = colours; frame.light = light; frame.t = t;
    if (backVersion !== colours.version) {
      backVersion = colours.version;
      bctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, vp.ox * dpr, vp.oy * dpr);
      for (const l of staticLayers) l.draw(bctx, frame);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(back, 0, 0);
    ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, vp.ox * dpr, vp.oy * dpr);
    for (const l of liveLayers) l.draw(ctx, frame);
  }

  function profile(colours: Resolved, light: Light, t: number) {
    frame.colours = colours; frame.light = light; frame.t = t;
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
