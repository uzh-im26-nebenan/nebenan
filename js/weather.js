const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=47.3769&longitude=8.5417&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FZurich";

const FALLBACK_HOURS = [
  { label: "Now", icon: "cloud-sun", temp: 13, rain: 20, rainy: false },
  { label: "12:00", icon: "cloud-sun", temp: 14, rain: 20, rainy: false },
  { label: "13:00", icon: "cloud-sun", temp: 15, rain: 25, rainy: false },
  { label: "14:00", icon: "cloud", temp: 14, rain: 40, rainy: false },
  { label: "15:00", icon: "cloud-rain", temp: 13, rain: 75, rainy: true },
  { label: "16:00", icon: "cloud-rain", temp: 12, rain: 80, rainy: true },
  { label: "17:00", icon: "cloud-rain", temp: 12, rain: 65, rainy: true },
];

export const FALLBACK_WEATHER = {
  live: false,
  dateLabel: "ZÜRICH · SATURDAY, 17 OCTOBER 2026",
  badge: "Illustrative demo · no live data",
  sourceLine: "Planned weather source: Open-Meteo",
  detailSource: "Example data · planned source: Open-Meteo",
  place: "Central Zürich",
  timeLabel: "11:00 · Demo",
  temp: 13,
  condition: "Cloudy with sunny spells",
  icon: "cloud-sun",
  feelsLike: 12,
  wind: 9,
  summary: "Head out now, stay indoors after 15:00.",
  hours: FALLBACK_HOURS,
  rainWindow: { from: "15:00", probability: 75, temp: 13 },
};

export function describeCode(code) {
  if (code === 0) return { icon: "cloud-sun", label: "Clear" };
  if (code === 1) return { icon: "cloud-sun", label: "Mainly clear" };
  if (code === 2) return { icon: "cloud-sun", label: "Cloudy with sunny spells" };
  if (code === 3) return { icon: "cloud", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "cloud", label: "Foggy" };
  if (code >= 51 && code <= 57) return { icon: "cloud-rain", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { icon: "cloud-rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { icon: "cloud", label: "Snow" };
  if (code >= 80 && code <= 82) return { icon: "cloud-rain", label: "Showers" };
  if (code >= 85 && code <= 86) return { icon: "cloud", label: "Snow showers" };
  if (code >= 95) return { icon: "cloud-rain", label: "Thunderstorm" };
  return { icon: "cloud", label: "Cloudy" };
}

function dateLabel(date) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `ZÜRICH · ${formatted.toUpperCase()}`;
}

function zurichStamp(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zurich",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    hourKey: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`,
    clock: `${parts.hour}:${parts.minute}`,
  };
}

function summaryFor(hours) {
  const later = hours.slice(1).find((hour) => hour.rain >= 50);
  if (hours[0]?.rain >= 50 && later) return "Stay indoors — rain is likely through the afternoon.";
  if (hours[0]?.rain >= 50) return "Stay indoors for now. Rain is likely this hour.";
  if (later) return `Head out now, stay indoors after ${later.label}.`;
  return "A dry stretch ahead — outdoor plans look comfortable.";
}

function parseForecast(data) {
  const current = data?.current;
  const hourly = data?.hourly;
  if (!current || !hourly?.time?.length) return { ...FALLBACK_WEATHER, hours: FALLBACK_HOURS.map((hour) => ({ ...hour })) };

  const now = new Date();
  const stamp = zurichStamp(now);
  let index = hourly.time.findIndex((time) => time >= stamp.hourKey);
  if (index < 0) index = Math.max(0, hourly.time.length - 7);
  const slice = hourly.time.slice(index, index + 7);
  if (!slice.length) return { ...FALLBACK_WEATHER, hours: FALLBACK_HOURS.map((hour) => ({ ...hour })) };

  const described = describeCode(current.weather_code);
  const hours = slice.map((time, offset) => {
    const sourceIndex = index + offset;
    const rain = Math.round(hourly.precipitation_probability?.[sourceIndex] ?? 0);
    const code = hourly.weather_code?.[sourceIndex];
    const hourDescribed = describeCode(code);
    return {
      label: offset === 0 ? "Now" : time.slice(11, 16),
      icon: offset === 0 ? described.icon : hourDescribed.icon,
      temp: Math.round(
        offset === 0 ? current.temperature_2m : hourly.temperature_2m?.[sourceIndex] ?? current.temperature_2m,
      ),
      rain,
      rainy: rain >= 50,
    };
  });

  const rainIndex = hours.findIndex((hour) => hour.rain >= 50);
  const rainHour = rainIndex >= 0 ? hours[rainIndex] : null;
  const rainSource = rainIndex >= 0 ? index + rainIndex : -1;

  return {
    live: true,
    dateLabel: dateLabel(now),
    badge: "Live · Open-Meteo",
    sourceLine: "Weather source: Open-Meteo",
    detailSource: "Live data · Open-Meteo",
    place: "Central Zürich",
    timeLabel: stamp.clock,
    temp: Math.round(current.temperature_2m),
    condition: described.label,
    icon: described.icon,
    feelsLike: null,
    wind: Math.round(current.wind_speed_10m ?? 0),
    summary: summaryFor(hours),
    hours,
    rainWindow: rainHour
      ? {
          from: rainHour.label === "Now" ? stamp.clock : rainHour.label,
          probability: rainHour.rain,
          temp: Math.round(hourly.temperature_2m?.[rainSource] ?? current.temperature_2m),
        }
      : null,
  };
}

export async function fetchWeather() {
  try {
    const response = await fetch(FORECAST_URL);
    if (!response.ok) return { ...FALLBACK_WEATHER, hours: FALLBACK_HOURS.map((hour) => ({ ...hour })) };
    return parseForecast(await response.json());
  } catch {
    return { ...FALLBACK_WEATHER, hours: FALLBACK_HOURS.map((hour) => ({ ...hour })) };
  }
}

export function whyItFits(activity, weather) {
  if (!weather.live) return activity.whyStatic;
  const rain = weather.rainWindow;
  if (rain) {
    return `The forecast shows a ${rain.probability}% chance of rain from ${rain.from} at ${rain.temp} °C. ${activity.fitLive}`;
  }
  return `The forecast stays mostly dry this afternoon at ${weather.temp} °C. ${activity.fitLiveDry}`;
}

export function suggestionLine(activity, weather) {
  if (!weather.live || !weather.rainWindow) return activity.suggestion;
  if (activity.setting === "outdoor") return `Our suggestion: before ${weather.rainWindow.from}`;
  return `Our suggestion: from ${weather.rainWindow.from}`;
}
