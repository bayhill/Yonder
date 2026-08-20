import type { Rng } from '../../core/random';

/**
 * Fine paper grain. Lives outside the frame loop entirely: a fixed DOM layer with
 * `mix-blend-mode: overlay`, composited by the browser, costing the render loop nothing.
 */
export function installGrain(rng: Rng, opacity = 0.13): HTMLElement {
  const r = rng.fork('grain');
  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = size; tile.height = size;
  const tctx = tile.getContext('2d')!;
  const img = tctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + r.gauss() * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  const el = document.createElement('div');
  el.id = 'grain';
  el.style.cssText = `position:fixed;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:${opacity};` +
    `background-image:url(${tile.toDataURL('image/png')});background-size:${size / 2}px ${size / 2}px;`;
  document.body.appendChild(el);
  return el;
}
