# Yonder

A living illustration of one Scandinavian meadow, drawn in real time from live weather.
Not a weather app — a view of somewhere else. See `yonder-agent-brief.md` for the full brief.

Live: https://bayhill.github.io/Yonder/

## Develop

```
npm install
npm run dev      # http://localhost:5173/Yonder/
npm test         # vitest
npm run build    # typecheck + static build into dist/
```

Dev-only URL parameters (Step 1, fixed moment): `?doy=200&el=22&az=235&cloud=0.5&fog=0.1`,
`?vp=420x840` renders a fixed viewport for portrait checks, `?skip=grass,trees` hides layers.
Press `S` in dev to save a PNG of the canvas.

## Structure

```
src/core       loop (fixed timestep), seeded rng, smoothing (no overshoot), easing
src/colour     OKLCH palettes per season → season blend → light model → resolved per-frame colours
src/scene      composition (1600×900 world, cover-crop anchored on the main tree), procgen, layers
src/render     canvas renderer; static back layers cached offscreen, grain as a DOM overlay
src/astronomy  sun/moon (Step 2)     src/wind  wind field (Step 3)
src/data       Open-Meteo (Step 7)   src/ui    timeline, label, picker (Step 7)
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`.
