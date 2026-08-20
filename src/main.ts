import { buildScene } from './scene/scene';
import { createRenderer } from './render/renderer';
import { createResolver } from './colour/resolve';
import { seasonPalette } from './colour/season';
import { computeLight } from './colour/light';
import { startLoop } from './core/loop';
import { SEED } from './config';
import { installGrain } from './scene/layers/grain';
import { createRng } from './core/random';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const params = new URLSearchParams(location.search);
const layers = buildScene(SEED).filter((l) => !params.has('skip') || !params.get('skip')!.split(',').some((n) => l.name.startsWith(n)));
const renderer = createRenderer(canvas, layers);
const resolve = createResolver();
installGrain(createRng(SEED));

// Step 1: a single fixed moment — summer, soft late-afternoon light, part cloud.
const doy = Number(params.get('doy') ?? 200);
const lightInput = {
  sunElevation: Number(params.get('el') ?? 22),
  sunAzimuth: Number(params.get('az') ?? 235),
  cloudCover: Number(params.get('cloud') ?? 0.5),
  fog: Number(params.get('fog') ?? 0.1),
};

const palette = seasonPalette(doy);
const light = computeLight(lightInput);
let t = 0;

startLoop({
  update(dt) {
    t += dt;
    for (const l of layers) l.update?.(dt, t);
  },
  render() {
    renderer.render(resolve(palette, light), light, t);
  },
});

if (import.meta.env.DEV) {
  import('./dev/devPanel').then((m) => m.installDevPanel(canvas));
  (window as unknown as { __yonder: unknown }).__yonder = {
    layers, renderer, profile: () => renderer.profile(resolve(palette, light), light, t),
  };
}
