import SunCalc from 'suncalc';

export interface MoonState {
  elevation: number;    // degrees
  azimuth: number;      // compass degrees
  fraction: number;     // illuminated fraction 0..1
  phase: number;        // 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter
}

export function moonState(date: Date, lat: number, lon: number, out: MoonState = { elevation: 0, azimuth: 0, fraction: 0, phase: 0 }): MoonState {
  const p = SunCalc.getMoonPosition(date, lat, lon);
  const i = SunCalc.getMoonIllumination(date);
  out.elevation = (p.altitude * 180) / Math.PI;
  out.azimuth = ((p.azimuth * 180) / Math.PI + 180 + 360) % 360;
  out.fraction = i.fraction;
  out.phase = i.phase;
  return out;
}
