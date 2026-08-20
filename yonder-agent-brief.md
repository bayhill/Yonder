# Project brief: Yonder
## An Artistic Approach to Weather Forecasting

You are building a single-page web experience called **Yonder**. It is a living illustration of one meadow with a few trees, rendered in real time from live weather data. It is not a weather app. It is a view of somewhere else, over there, out of reach. The person looking at it should feel the weather before they read it.

The name is the design principle. Yonder is always a little distant: the composition keeps the viewer at the edge of the meadow looking in, the far layers carry most of the atmosphere, and nothing on screen ever asks for attention. Let the name guide every choice about restraint.

Read this whole brief before writing any code. The priorities are, in order: visual beauty, smoothness of motion, artistic coherence, data fidelity, features. If you ever trade one for another, trade downwards on that list, never upwards.

---

## 1. The feeling we are after

Imagine a painting that someone left running. A Scandinavian meadow in the flat light of the north. Long grass, a gentle rise, three or four birches or pines against a wide sky. Nothing happens quickly. Grass leans. Clouds drift. Light moves. Rain arrives as a softening of the far trees before a single drop is visible. Snow settles over hours, not seconds.

Reference moods (not styles to copy, feelings to aim at):
- Hasui and Hiroshige prints: weather as atmosphere, restraint in line
- Modern Scandinavian illustration: flat shapes, muted palettes, generous negative space
- Studio Ghibli backgrounds: wind made visible through grass, but slower than that
- The way light actually behaves at 59° north in each season

Anti-references, things this must never look like:
- A weather widget with animated icons
- A game scene with sprites and particle effects
- Stock "nature illustration" with saturated greens and a smiling sun
- Anything that moves fast, bounces, pops or eases with overshoot

If the scene were paused at any random moment and screenshotted, it should look like a deliberate illustration somebody would print. That is the bar.

---

## 2. The scene

One fixed composition. The camera never moves. The layout never changes. Only light, colour, atmosphere and motion change.

**Composition (16:9 reference, must also work at portrait mobile):**
- Sky occupies the top ~60%
- A low horizon with a gentle rise to one side, slightly off centre
- Foreground: tall meadow grass, dense, individually drawn blades in the nearest band, thinning to texture further back
- Mid-ground: three or four trees, one prominent, the rest receding. Mixed birch and pine reads most Scandinavian. Trees must have believable silhouettes, asymmetric, with varied branch density
- Far distance: a soft treeline or low hills that exists mainly to be eaten by fog and haze
- Optional, very subtle: a single fence post, a rock, something that gives scale. Never a house, road or person

Build the scene in **depth layers**. At minimum: sky, far hills, far treeline, mid trees, near trees, back grass, mid grass, front grass, foreground atmosphere. Each layer responds to wind and light independently, with near layers moving more than far ones (parallax of motion, not of camera).

**Drawing approach:**
- Vector shapes (SVG paths or Canvas path drawing), never raster sprites
- Trees and grass should be procedurally generated from a seed so they are unique but consistent across sessions
- Grass blades are curved paths with a base and a tip; the tip responds to wind, the base does not
- Foliage as clustered soft shapes, not individual leaves; think masses of colour with slightly irregular edges
- Line work minimal or absent; form comes from colour and value, not outlines
- A very fine grain or paper texture overlay at low opacity is permitted and encouraged to kill the "digital flat" look

---

## 3. Colour

Colour is the primary storyteller. Treat it as a system, not as per-element hex values.

**Principles:**
- Define a small palette per season (spring, summer, autumn, winter, plus a mud/thaw transition). Each palette has: sky zenith, sky horizon, far atmosphere, foliage, trunk, grass near, grass far, ground, snow. Around 8 to 10 colours per season
- Everything on screen is derived from the active palette blended with lighting. No element has a hard-coded colour independent of the system
- Blend between seasonal palettes continuously by day of year; there are no visible switches
- Low saturation overall. Scandinavian light is cool and soft. Saturation rises slightly in the golden hours and in high summer, and falls in overcast and winter
- Use perceptual colour spaces for blending (OKLCH or OKLab), not RGB. Blending in RGB produces muddy midpoints and is the single most common reason procedural scenes look cheap

**Light:**
- Compute sun elevation and azimuth from location and time. Use it to derive:
  - Sky gradient (zenith to horizon, with a warm band near the sun at low angles)
  - Overall scene brightness and warmth
  - Shadow direction and length on the ground (soft, subtle; a gradient, not a hard shape)
  - Which side of trees and grass catches light
- Below the horizon, move through civil, nautical and astronomical twilight with correct colour progression: warm horizon fading to deep blue, then near-black with stars at full dark
- Cloud cover acts as a dimmer and a desaturator on everything, and flattens shadows towards nothing
- Night is never pure black. Use deep blue-greys with a faint horizon glow. The moon, when up and not fully clouded, gives a cool silver key light. Render the moon at the correct phase

---

## 4. Motion and smoothness

This is where the project lives or dies. Read this section twice.

**Frame rate and loop:**
- Target a locked 60fps on a mid-range laptop and a recent phone. Measure it. If you cannot hold 60, reduce element count before reducing quality of easing
- Use requestAnimationFrame with a fixed-timestep simulation and interpolated rendering, so motion looks identical at 30, 60 and 120Hz
- Never let a garbage collection pause show. Preallocate arrays. Avoid allocating objects inside the frame loop
- Pause the loop when the tab is hidden; resume smoothly without a jump

**Wind:**
- Wind is a **field**, not a global variable. Model it as low-frequency noise (simplex or Perlin) sampled in space and time, scaled by the reported wind speed and biased by the reported direction
- Gusts are travelling waves through the field. You should be able to see a gust arrive at the far trees, cross the mid-ground and reach the foreground grass roughly a second later
- Each grass blade samples the field at its position and bends accordingly, with a slight spring return (critically damped, never bouncy)
- Trees bend at the trunk slightly and the canopy more; pine canopies move less than birch canopies; birches shiver at higher frequency in strong wind
- At zero wind, nothing is perfectly still. Keep a very faint idle drift so the scene is alive. Real air is never motionless

**Clouds:**
- Clouds are layered soft shapes at two or three altitudes, moving at different speeds with the wind
- Their density maps to cloud cover percentage. 0% is a clear sky. 100% is a continuous soft ceiling, not a wall of individual clouds
- Use a noise-based approach for cloud shape so they evolve slowly rather than being fixed blobs that scroll

**Precipitation:**
- Rain: fine diagonal streaks, angle driven by wind, opacity driven by intensity. Heavy rain reduces visibility of the far layers before adding more streaks. Rain should be felt mostly as atmosphere, with only light streaks visible
- Snow: slow, drifting, wind-affected flakes with varied size. Snow **accumulates**: on the ground as a rising white layer with a soft edge, on branches as caps, on the tops of grass until the grass bends under it. Accumulation and melt happen over simulated hours based on temperature and precipitation history
- Sleet and freezing rain exist; treat them as blends

**Atmosphere:**
- Fog and humidity as a distance-based desaturation and lightening, strongest on far layers. Fog rolls in; it does not switch on
- Heat shimmer on hot clear days as a very faint vertical distortion of the far treeline. Subtle to the point of doubt

**Easing and transitions:**
- Every value that changes over time must be smoothed. Weather data updates discretely; the scene must never react discretely. Use exponential smoothing or spring dynamics toward target values, with time constants measured in minutes for weather and seconds for wind gusts
- No easing function with overshoot anywhere. No bounce. No elastic
- When scrubbing the forecast timeline, the scene should catch up in about a second with the same smoothing, so it feels like time passing rather than a scene swap

---

## 5. Data

- Source: Open-Meteo (free, no key). Pull hourly forecast for 48 hours ahead and hourly history for 24 hours back, for: temperature, precipitation and type, cloud cover (low, mid, high if available), wind speed, wind direction, wind gusts, humidity, visibility, snow depth if available
- Compute sun and moon position locally from lat/lon and time (a small astronomy library or hand-rolled solar position algorithm)
- Default location: Norrtälje, Sweden. Allow any location via URL parameter and a very quiet picker
- Interpolate between hourly data points so the scene changes continuously, never on the hour
- Use the 24 hours of history to initialise stateful effects (snow cover, wet ground) so the scene is correct on first load
- Cache responses; refresh every 30 minutes; never let a failed fetch break the scene (keep the last good state)

---

## 6. The forecast

The scene is "now" by default. A timeline lets the viewer move through the next 48 hours.

- The timeline is nearly invisible until the pointer moves or the screen is touched, then fades in along the bottom edge: a thin line with a marker and a small time label
- Dragging the marker moves the scene's time. Sun, clouds, wind, precipitation and temperature follow. Releasing returns to now after a few seconds of stillness, or stays if the viewer taps to lock
- Keyboard: left and right arrows step one hour
- The word "forecast" appears nowhere. Nothing is labelled. The only text on screen is the time and an optional place name in a corner, in a quiet, well-set typeface

---

## 7. Interface

- Zero chrome by default. The illustration is the whole page, edge to edge
- On pointer movement: the timeline and a small corner label fade in over 400ms and fade out after 3s of stillness
- A location picker behind the corner label, as a minimal text field with geocoding via Open-Meteo's geocoding endpoint
- Typography: one typeface, light weight, small size, low contrast against the scene. The text should feel like a caption on a print
- Respect prefers-reduced-motion by reducing but not eliminating movement
- Fully responsive. On portrait mobile, the composition crops towards the main tree and foreground grass rather than squashing

---

## 8. Technical constraints

- Plain TypeScript with Vite. No framework for the scene itself; React is permitted only for the tiny overlay UI if you want it
- Rendering: Canvas 2D is the default choice for performance with hundreds of grass blades. WebGL is acceptable if you can justify it and it does not make the code unreadable. SVG is acceptable only if you can hold 60fps
- No heavy dependencies. A noise library, an astronomy library and a colour-space library are fine. Nothing else unless justified
- All procedural generation is seeded and deterministic
- Clean module structure: data, astronomy, weather state and smoothing, wind field, scene layers, renderer, UI. Each independently testable
- Deployable as a static site

---

## 9. How to work

Build in this order and stop to review visual quality at each step. Do not proceed to the next step until the current one looks like a finished illustration on its own.

1. **Still composition.** Sky gradient, hills, trees and grass at a single fixed time and weather. Iterate on shapes and colour until it is a beautiful still image. Spend real effort here; this step matters more than all the others combined
2. **Light.** Drive the still scene from sun position through a full day and night cycle. Check golden hour, twilight progression and night
3. **Wind.** Add the wind field and grass and tree response. Check at 0, 3, 8 and 15 m/s. Check that gusts travel visibly across the scene
4. **Clouds and sky states.** Cover from clear to overcast, and the light dimming that comes with it
5. **Season.** Blend palettes across the year. Check solstices and equinoxes, and the autumn turn
6. **Precipitation and accumulation.** Rain, snow, settling, melt
7. **Live data and the timeline.**
8. **Polish.** Grain, atmosphere, idle motion, transitions, mobile crop, reduced motion

At each step, render a set of reference screenshots (for example: summer noon clear, autumn dusk overcast, winter night snowing, spring dawn fog, summer evening strong wind) and look at them critically as an art director would. Ask of each one: would I print this? If not, fix it before moving on.

Prefer fewer, better elements. Three excellent trees beat twelve mediocre ones. Two hundred well-behaved grass blades beat two thousand jittery ones.

When uncertain about an aesthetic choice, choose the quieter option.

---

## 10. Definition of done

- Holds 60fps on a 2020 laptop and a recent mid-range phone
- Any random screenshot at any time of year and any weather looks like an intentional illustration
- Weather changes are never perceptible as changes; the viewer notices the scene *is* different, not that it *became* different
- Wind is legible at a glance without numbers
- The viewer can tell, roughly, the season, time of day and weather just by looking
- No text on screen except a time and an optional place name
- Works with Norrtälje by default and any location by URL or picker
- Code is readable enough that a second developer could add fog, sound or a new season palette in an afternoon

That is the whole job. Make something people would leave open on a second screen all day, just to glance over at somewhere yonder.
