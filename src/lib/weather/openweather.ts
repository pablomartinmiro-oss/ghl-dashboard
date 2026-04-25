import { logger } from "@/lib/logger";

const log = logger.child({ module: "openweather" });

export interface WeatherDay {
  date: Date;
  tempMin: number;
  tempMax: number;
  snowfall: number;
  windSpeed: number;
  conditions: string;
  raw: unknown;
}

interface OpenWeatherDaily {
  dt: number;
  temp: { min: number; max: number };
  wind_speed: number;
  weather: Array<{ main: string; description: string }>;
  snow?: number;
  rain?: number;
}

interface OpenWeatherResponse {
  daily?: OpenWeatherDaily[];
}

export async function fetchForecast(
  latitude: number,
  longitude: number
): Promise<WeatherDay[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    log.warn("OPENWEATHER_API_KEY not set — returning mock forecast");
    return mockForecast();
  }

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("exclude", "current,minutely,hourly,alerts");
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "es");
  url.searchParams.set("appid", apiKey);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      log.error({ status: res.status }, "OpenWeather request failed");
      return mockForecast();
    }
    const data = (await res.json()) as OpenWeatherResponse;
    const days = data.daily ?? [];
    return days.slice(0, 7).map((d): WeatherDay => ({
      date: new Date(d.dt * 1000),
      tempMin: d.temp.min,
      tempMax: d.temp.max,
      snowfall: d.snow ?? 0,
      windSpeed: d.wind_speed,
      conditions: d.weather?.[0]?.description ?? "—",
      raw: d,
    }));
  } catch (error) {
    log.error({ error }, "Failed to fetch forecast");
    return mockForecast();
  }
}

function mockForecast(): WeatherDay[] {
  const out: WeatherDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push({
      date: d,
      tempMin: -5 + Math.round(Math.random() * 5),
      tempMax: 2 + Math.round(Math.random() * 6),
      snowfall: Math.round(Math.random() * 25),
      windSpeed: 5 + Math.round(Math.random() * 20),
      conditions: ["nieve ligera", "nubes", "soleado", "nieve fuerte"][i % 4],
      raw: { mock: true },
    });
  }
  return out;
}
