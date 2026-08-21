import { approach, approachAngle } from '../core/smoothing';
import type { WeatherControls } from './controls';

/**
 * Weather arrives discretely; the scene must never react discretely. Every control approaches
 * its target exponentially. `tau` is seconds: ~1–2 s while scrubbing or in the dev panel,
 * minutes for live data (Step 7).
 */
export class SmoothedWeather {
  readonly value: WeatherControls;
  tau = 1.5;
  constructor(public target: WeatherControls) {
    this.value = { ...target };
  }
  /** Snap to the target (first load, location change). */
  snap() { Object.assign(this.value, this.target); }
  step(dt: number) {
    const v = this.value, t = this.target, tau = this.tau;
    v.cloudCover = approach(v.cloudCover, t.cloudCover, tau, dt);
    v.fog = approach(v.fog, t.fog, tau, dt);
    v.windSpeed = approach(v.windSpeed, t.windSpeed, tau, dt);
    v.windGust = approach(v.windGust, t.windGust, tau, dt);
    v.windDir = approachAngle(v.windDir, t.windDir, tau, dt);
    v.rain = approach(v.rain, t.rain, tau, dt);
    v.snow = approach(v.snow, t.snow, tau, dt);
    v.temperature = approach(v.temperature, t.temperature, tau, dt);
    v.humidity = approach(v.humidity, t.humidity, tau, dt);
    v.thunder = approach(v.thunder, t.thunder, tau, dt);
  }
}
