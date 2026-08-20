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

In dev a control panel (toggle with `` ` ``) exposes time, time-lapse speed, cloud, fog, wind, rain, snow and
temperature; every change is mirrored into the URL. Parameters: `?hour=13.5&doy=200&time=ISO&cloud=0.5&fog=0.1`
`&wind=8&gust=12&dir=240&rain=2&snow=1.5&temp=-3`, `?vp=420x840` fixed viewport, `?skip=grass,trees` hides layers.
`S` saves a PNG, `[` `]` ±1 h, `{` `}` ±1 day, `0` back to now.

## Structure

```
src/core       loop (fixed timestep), seeded rng, smoothing (no overshoot), easing
src/colour     OKLCH palettes per season → season blend → light model → resolved per-frame colours
src/scene      composition (1600×900 world, cover-crop anchored on the main tree), procgen, layers
src/render     canvas renderer; static back layers cached offscreen, grain as a DOM overlay
src/astronomy  sun/moon              src/wind     wind field, gusts
src/weather    controls → smoothing → accumulation (snow cover, wet ground)
src/data       Open-Meteo (Step 7)   src/ui       timeline, label, picker (Step 7)
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`.
