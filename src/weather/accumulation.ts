import type { WeatherControls } from './controls';
import { clamp } from '../core/easing';

/**
 * Stateful ground effects, integrated in simulated hours.
 *  snow  0..1+  snow cover (1 ≈ a closed blanket; ~12 mm water equivalent)
 *  wet   0..1   ground wetness (darkens ground and grass; dries with warmth and wind)
 */
export class Accumulation {
  snow = 0;
  wet = 0;
  step(dtHours: number, w: WeatherControls) {
    if (dtHours <= 0) return;
    const T = w.temperature;
    // Snowfall accumulates; wet snow near 0 °C settles less.
    const settle = T > 0.5 ? 0.55 : 1;
    this.snow += (w.snow / 12) * settle * dtHours;
    // Melt above freezing, faster when warm and when it rains on the snow.
    if (T > 0 && this.snow > 0) this.snow -= (0.018 * T + 0.05 * w.rain) * dtHours;
    // Sublimation / compaction: very slow loss even below freezing.
    this.snow -= 0.002 * dtHours;
    this.snow = clamp(this.snow, 0, 1.4);

    // Rain (and melting snow) wets the ground; it dries with warmth, wind and time.
    const melting = T > 0 && this.snow > 0 ? 0.3 : 0;
    this.wet += (w.rain * 0.6 + melting) * (1 - this.wet) * dtHours;
    this.wet -= (0.06 + 0.012 * Math.max(0, T) + 0.01 * w.windSpeed) * this.wet * dtHours;
    this.wet = clamp(this.wet, 0, 1);
  }
}
