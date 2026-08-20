/**
 * Seasonal palettes, authored in OKLCH (l 0..1, c chroma, h hue degrees).
 * Nothing else in the app holds a colour value; every pixel derives from these via light.
 * Summer is the tuned reference. The others are first drafts until Step 5.
 */
export interface Oklch { l: number; c: number; h: number }

export const ROLES = [
  'skyZenith', 'skyHorizon', 'farAtmosphere',
  'hills', 'farTreeline',
  'foliage', 'foliageBirch', 'trunk', 'bark',
  'grassNear', 'grassFar', 'ground', 'snow',
] as const;
export type Role = (typeof ROLES)[number];
export type Palette = Record<Role, Oklch>;

const c = (l: number, c: number, h: number): Oklch => ({ l, c, h });

export const summer: Palette = {
  skyZenith:     c(0.70, 0.050, 238),
  skyHorizon:    c(0.89, 0.028, 80),
  farAtmosphere: c(0.84, 0.022, 225),
  hills:         c(0.72, 0.026, 222),
  farTreeline:   c(0.50, 0.045, 178),
  foliage:       c(0.43, 0.055, 162),
  foliageBirch:  c(0.60, 0.072, 132),
  trunk:         c(0.36, 0.030, 55),
  bark:          c(0.85, 0.016, 80),
  grassNear:     c(0.50, 0.074, 128),
  grassFar:      c(0.64, 0.068, 114),
  ground:        c(0.60, 0.060, 100),
  snow:          c(0.95, 0.010, 230),
};

export const spring: Palette = {
  skyZenith:     c(0.76, 0.048, 240),
  skyHorizon:    c(0.90, 0.022, 90),
  farAtmosphere: c(0.87, 0.016, 230),
  hills:         c(0.70, 0.028, 228),
  farTreeline:   c(0.52, 0.035, 170),
  foliage:       c(0.44, 0.050, 162),
  foliageBirch:  c(0.72, 0.090, 122),   // fresh, small leaves
  trunk:         c(0.38, 0.028, 55),
  bark:          c(0.86, 0.014, 82),
  grassNear:     c(0.58, 0.060, 118),
  grassFar:      c(0.70, 0.045, 105),   // last year's straw greening up
  ground:        c(0.60, 0.040, 85),
  snow:          c(0.95, 0.010, 230),
};

export const autumn: Palette = {
  skyZenith:     c(0.66, 0.040, 238),
  skyHorizon:    c(0.86, 0.030, 75),
  farAtmosphere: c(0.82, 0.020, 225),
  hills:         c(0.64, 0.030, 228),
  farTreeline:   c(0.47, 0.040, 172),
  foliage:       c(0.42, 0.050, 163),
  foliageBirch:  c(0.74, 0.120, 84),    // the birch turn: clear gold
  trunk:         c(0.34, 0.030, 50),
  bark:          c(0.85, 0.014, 82),
  grassNear:     c(0.60, 0.065, 95),
  grassFar:      c(0.70, 0.055, 88),
  ground:        c(0.55, 0.050, 70),
  snow:          c(0.95, 0.010, 230),
};

export const winter: Palette = {
  skyZenith:     c(0.74, 0.028, 242),
  skyHorizon:    c(0.88, 0.015, 60),
  farAtmosphere: c(0.86, 0.012, 235),
  hills:         c(0.76, 0.018, 235),
  farTreeline:   c(0.48, 0.022, 200),
  foliage:       c(0.40, 0.040, 168),
  foliageBirch:  c(0.52, 0.020, 50),    // bare twigs: a brown-grey haze
  trunk:         c(0.34, 0.020, 50),
  bark:          c(0.88, 0.008, 85),
  grassNear:     c(0.66, 0.030, 85),    // dead straw
  grassFar:      c(0.75, 0.022, 80),
  ground:        c(0.68, 0.022, 78),
  snow:          c(0.95, 0.008, 235),
};

export const thaw: Palette = {
  skyZenith:     c(0.70, 0.030, 240),
  skyHorizon:    c(0.86, 0.018, 70),
  farAtmosphere: c(0.84, 0.012, 232),
  hills:         c(0.68, 0.020, 230),
  farTreeline:   c(0.46, 0.028, 190),
  foliage:       c(0.42, 0.045, 165),
  foliageBirch:  c(0.50, 0.022, 55),
  trunk:         c(0.32, 0.025, 50),
  bark:          c(0.86, 0.010, 85),
  grassNear:     c(0.55, 0.035, 90),
  grassFar:      c(0.64, 0.030, 85),
  ground:        c(0.48, 0.030, 65),    // wet, dark
  snow:          c(0.93, 0.008, 235),
};

export const palettes = { spring, summer, autumn, winter, thaw } as const;
export type SeasonName = keyof typeof palettes;
