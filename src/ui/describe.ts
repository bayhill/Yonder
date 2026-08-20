import type { WeatherControls } from '../weather/controls';

/**
 * The scene in words, for people who cannot see it: set as the canvas's aria-label and refreshed
 * once a minute. The only place Yonder says what the weather is.
 */
export function describeScene(place: string, date: Date, w: WeatherControls, sunElevation: number, snowCover: number): string {
  const time = sunElevation > 6 ? 'day' : sunElevation > -6 ? (date.getHours() < 12 ? 'dawn' : 'dusk') : 'night';
  const sky = w.cloudCover < 0.2 ? 'clear' : w.cloudCover < 0.6 ? 'some cloud' : w.cloudCover < 0.9 ? 'mostly cloudy' : 'overcast';
  const wind = w.windSpeed < 1.5 ? 'still air' : w.windSpeed < 5 ? 'a light breeze' : w.windSpeed < 10 ? 'a fresh wind' : 'a strong wind';
  const precip = w.snow > 0.2 ? 'snow falling' : w.rain > 2 ? 'heavy rain' : w.rain > 0.2 ? 'light rain' : w.fog > 0.4 ? 'fog' : '';
  const ground = snowCover > 0.5 ? 'snow on the ground' : snowCover > 0.1 ? 'a dusting of snow' : '';
  const parts = [`${Math.round(w.temperature)} degrees`, sky, wind, precip, ground].filter(Boolean);
  return `A meadow near ${place}, ${time}: ${parts.join(', ')}.`;
}
