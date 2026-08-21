export interface Location { name: string; lat: number; lon: number }

/** One hourly sample, normalised to the units the scene uses. */
export interface WeatherSample {
  time: number;          // ms since epoch (UTC)
  temperature: number;   // °C
  rain: number;          // mm/h (liquid)
  snow: number;          // mm/h water equivalent
  cloudCover: number;    // 0..1
  cloudLow: number; cloudMid: number; cloudHigh: number; // 0..1
  windSpeed: number;     // m/s
  windDir: number;       // compass degrees (from)
  windGust: number;      // m/s
  humidity: number;      // 0..1
  visibility: number;    // metres
  snowDepth: number | null; // metres, when the model provides it
  thunder: number;       // 0..1, thunderstorm reported this hour
}

export interface WeatherSeries {
  location: Location;
  fetchedAt: number;
  samples: WeatherSample[]; // hourly, ascending
}
