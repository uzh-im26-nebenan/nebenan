const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=47.3769&longitude=8.5417&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FZurich&forecast_days=3";

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
  sourceLine: "Example weather, not a live forecast",
  detailSource: "Example data",
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
  peakRain: 80,
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

function zurichParts(date) {
  return Object.fromEntries(
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
}

function zurichDayKey(dayOffset) {
  const parts = zurichParts(new Date());
  const utc = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + dayOffset));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function summaryFor(hours) {
  const later = hours.slice(1).find((hour) => hour.rain >= 50);
  if (hours[0]?.rain >= 50 && later) return "Stay indoors — rain is likely through the afternoon.";
  if (hours[0]?.rain >= 50) return "Stay indoors for now. Rain is likely this hour.";
  if (later) return `Head out now, stay indoors after ${later.label}.`;
  return "A dry stretch ahead — outdoor plans look comfortable.";
}

function hourRecord(time, temp, rainValue, code, label) {
  const described = describeCode(code);
  const rain = Math.round(rainValue ?? 0);
  return {
    label,
    icon: described.icon,
    condition: described.label,
    temp: Math.round(temp),
    rain,
    rainy: rain >= 50,
    code,
  };
}

function viewFromHours({ date, timeLabel, temp, condition, icon, wind, feelsLike, hours, live }) {
  const rainIndex = hours.findIndex((hour) => hour.rain >= 50);
  const rainHour = rainIndex >= 0 ? hours[rainIndex] : null;
  const peakRain = hours.reduce((max, hour) => Math.max(max, hour.rain), 0);
  return {
    live,
    dateLabel: dateLabel(date),
    badge: live ? "Live · Open-Meteo" : FALLBACK_WEATHER.badge,
    sourceLine: live ? "Weather source: Open-Meteo" : FALLBACK_WEATHER.sourceLine,
    detailSource: live ? "Live data · Open-Meteo" : FALLBACK_WEATHER.detailSource,
    place: "Central Zürich",
    timeLabel,
    temp,
    condition,
    icon,
    feelsLike,
    wind,
    summary: summaryFor(hours),
    hours,
    rainWindow: rainHour
      ? {
          from: rainHour.label === "Now" ? timeLabel : rainHour.label,
          probability: rainHour.rain,
          temp: rainHour.temp,
        }
      : null,
    peakRain,
  };
}

function offlineView() {
  return {
    ...FALLBACK_WEATHER,
    hours: FALLBACK_HOURS.map((hour) => ({ ...hour })),
  };
}

function todayView(payload) {
  const current = payload.current;
  const hourly = payload.hourly;
  const parts = zurichParts(new Date());
  const hourKey = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
  let index = hourly.time.findIndex((time) => time >= hourKey);
  if (index < 0) index = Math.max(0, hourly.time.length - 7);
  const slice = hourly.time.slice(index, index + 7);
  if (!slice.length) return offlineView();

  const described = describeCode(current.weather_code);
  const hours = slice.map((time, offset) => {
    const sourceIndex = index + offset;
    const record = hourRecord(
      time,
      offset === 0 ? current.temperature_2m : hourly.temperature_2m?.[sourceIndex],
      hourly.precipitation_probability?.[sourceIndex],
      offset === 0 ? current.weather_code : hourly.weather_code?.[sourceIndex],
      offset === 0 ? "Now" : time.slice(11, 16),
    );
    if (offset === 0) record.icon = described.icon;
    return record;
  });

  return viewFromHours({
    date: new Date(),
    timeLabel: `${parts.hour}:${parts.minute}`,
    temp: Math.round(current.temperature_2m),
    condition: described.label,
    icon: described.icon,
    wind: Math.round(current.wind_speed_10m ?? 0),
    feelsLike: null,
    hours,
    live: true,
  });
}

function futureView(payload, dayOffset) {
  const dayKey = zurichDayKey(dayOffset);
  const hourly = payload.hourly;
  const indexes = [];
  hourly.time.forEach((time, index) => {
    if (!time.startsWith(dayKey)) return;
    const hour = Number(time.slice(11, 13));
    if (hour >= 11 && hour <= 17) indexes.push(index);
  });
  if (!indexes.length) return offlineView();

  const hours = indexes.map((index) => {
    const time = hourly.time[index];
    return hourRecord(
      time,
      hourly.temperature_2m?.[index],
      hourly.precipitation_probability?.[index],
      hourly.weather_code?.[index],
      time.slice(11, 16),
    );
  });
  const midday = hours.find((hour) => hour.label === "14:00") || hours[Math.floor(hours.length / 2)];
  midday.current = true;
  const [year, month, day] = dayKey.split("-").map(Number);

  return viewFromHours({
    date: new Date(Date.UTC(year, month - 1, day, 12)),
    timeLabel: midday.label,
    temp: midday.temp,
    condition: midday.condition,
    icon: midday.icon,
    wind: null,
    feelsLike: null,
    hours,
    live: true,
  });
}

export async function fetchWeather() {
  try {
    const response = await fetch(FORECAST_URL);
    if (!response.ok) return { live: false };
    const data = await response.json();
    if (!data?.current || !data?.hourly?.time?.length) return { live: false };
    return { live: true, current: data.current, hourly: data.hourly };
  } catch {
    return { live: false };
  }
}

export function weatherForDay(payload, dayOffset) {
  if (!payload?.live) return offlineView();
  if (!dayOffset) return todayView(payload);
  return futureView(payload, dayOffset);
}

export function scoreActivity(activity, weather) {
  const rain = weather.peakRain ?? weather.rainWindow?.probability ?? 0;
  let score;
  if (rain >= 50) {
    const span = Math.min(1, (rain - 50) / 50);
    score = activity.setting === "indoor" ? 90 + span * 10 : 40 - span * 20;
  } else if (rain < 30) {
    const span = Math.min(1, rain / 30);
    score = activity.setting === "outdoor" ? 100 - span * 10 : 50 + span * 20;
  } else {
    score = activity.setting === "indoor" ? 75 : 55;
  }
  return Math.round(score);
}

export function whyItFits(activity, weather) {
  if (!weather.live) return activity.whyStatic;
  const rain = weather.peakRain ?? 0;
  const rainWindow = weather.rainWindow;
  const first = weather.hours?.[0];
  const startsLater = Boolean(rainWindow && first && first.rain < 50 && rainWindow.from !== first.label);
  const chance = rainWindow?.probability ?? rain;
  const time = rainWindow?.from ?? weather.timeLabel;

  if (activity.setting === "outdoor" && startsLater) {
    return `Mostly dry until ${rainWindow.from} — great for a quick visit before rain starts.`;
  }
  if (activity.setting === "outdoor" && rain < 30) {
    return `Pleasant, dry conditions (${weather.temp}°C) — ideal for exploring outside.`;
  }
  if (activity.setting === "indoor" && rain >= 50) {
    return `Forecast shows a ${chance}% chance of rain around ${time}. Great time to stay dry indoors.`;
  }
  if (activity.setting === "outdoor") {
    return `Forecast shows a ${chance}% chance of rain around ${time}. A short outdoor visit may get wet.`;
  }
  return `Pleasant, dry conditions (${weather.temp}°C) — a calm indoor option if you would rather stay inside.`;
}

export function suggestionLine(activity, weather) {
  if (!weather.live || !weather.rainWindow) return activity.suggestion;
  if (activity.setting === "outdoor") return `Our suggestion: before ${weather.rainWindow.from}`;
  return `Our suggestion: from ${weather.rainWindow.from}`;
}
