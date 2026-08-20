import SunCalc from 'suncalc';

export interface SunState {
  elevation: number; // degrees above the horizon
  azimuth: number;   // compass degrees: 0 N, 90 E, 180 S, 270 W
}

/** Sun position for a time and place. suncalc's azimuth is from south, positive west; convert to compass. */
export function sunPosition(date: Date, lat: number, lon: number, out: SunState = { elevation: 0, azimuth: 0 }): SunState {
  const p = SunCalc.getPosition(date, lat, lon);
  out.elevation = (p.altitude * 180) / Math.PI;
  out.azimuth = ((p.azimuth * 180) / Math.PI + 180 + 360) % 360;
  return out;
}
