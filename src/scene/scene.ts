import { createRng } from '../core/random';
import type { Layer } from './layer';
import { skyLayer } from './layers/sky';
import { sunLayer } from './layers/sun';
import { createBirds } from './layers/birds';
import { createPost } from './layers/post';
import { createFlowers } from './layers/flowers';
import { createStars } from './layers/stars';
import { createMoon } from './layers/moon';
import { createClouds } from './layers/clouds';
import { createRain, createSnow } from './layers/precipitation';
import { fogLayer, createShimmer } from './layers/atmosphere';
import { createSnowSheet } from './layers/snowCover';
import type { MoonState } from '../astronomy/moon';
import { createFarHills } from './layers/farHills';
import { createFarTreeline } from './layers/farTreeline';
import { createGround } from './layers/ground';
import { createTrees } from './layers/trees';
import { createGrassBand } from './layers/grass';
import { groundTop, LAYOUT, WORLD } from './composition';

/** Assembles the depth-ordered layer stack from one seed. */
export function buildScene(seed: string, moon: MoonState, cloudCover: () => number): Layer[] {
  const rng = createRng(seed);
  const gt = groundTop;

  const farTrees = createTrees([
    { kind: 'pine', x: 340, y: gt(340) + 4, height: 120, depth: 0.58, lean: 0.2 },
    { kind: 'birch', x: 1345, y: gt(1345) + 5, height: 140, depth: 0.46, lean: -0.3 },
    { kind: 'pine', x: 1290, y: gt(1290) + 8, height: 190, depth: 0.42 },
  ], rng.fork('farTrees'));

  const nearTrees = createTrees([
    { kind: 'pine', x: 1165, y: gt(1165) + 14, height: 300, depth: 0.24, lean: -0.15 },
    { kind: 'birch', x: LAYOUT.mainTreeX, y: gt(LAYOUT.mainTreeX) + 18, height: 360, depth: 0.12, lean: 0.35 },
  ], rng.fork('nearTrees'));

  const backGrass = createGrassBand({
    count: 760, x0: -20, x1: WORLD.w + 20,
    y0: (x) => gt(x) + 4, y1: (x) => gt(x) + 70,
    hMin: 12, hMax: 26, wMin: 2, wMax: 3.6, perspective: 0.6, leanBias: 0.05, clump: 0.5,
  }, 'grassFar', 0.3, rng.fork('backGrass'), 0.7);

  const midGrass = createGrassBand({
    count: 900, x0: -30, x1: WORLD.w + 30,
    y0: (x) => gt(x) + 70, y1: () => 790,
    hMin: 28, hMax: 62, wMin: 2.8, wMax: 5.2, perspective: 1.0, leanBias: 0.06, clump: 0.55,
  }, 'grassNear', 0.12, rng.fork('midGrass'), 0.8, { rootShade: 0.8 });

  const frontGrass = createGrassBand({
    count: 480, x0: -60, x1: WORLD.w + 60,
    y0: () => 795, y1: () => WORLD.h + 30,
    hMin: 70, hMax: 150, wMin: 4.5, wMax: 8, perspective: 0.9, leanBias: 0.07, clump: 0.6,
  }, 'grassNear', 0, rng.fork('frontGrass'), 0.85, { rootShade: 1 });

  const treeline = createFarTreeline(rng);
  return [
    skyLayer,
    createStars(rng),
    createMoon(moon),
    sunLayer,
    createClouds(rng, cloudCover),
    createFarHills(rng),
    createBirds(rng),
    treeline,
    createShimmer(treeline),
    createGround(rng),
    createSnowSheet(rng, 'far'),
    farTrees,
    createSnow(rng, 'far'),
    fogLayer,
    backGrass,
    nearTrees,
    createPost(rng),
    midGrass,
    createFlowers(rng),
    createSnowSheet(rng, 'near'),
    frontGrass,
    createSnow(rng, 'near'),
    createRain(rng),
  ];
}
