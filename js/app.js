import { ZURICH_HB } from "../data/activities.js";
import { createMap } from "./map.js";
import { fallbackPlaces, fetchPlaces } from "./places.js";
import { FALLBACK_WEATHER, fetchWeather, scoreActivity, suggestionLine, weatherForDay, whyItFits } from "./weather.js";

const ICONS = {
  "arrow-left": ["assets/icons/arrow-left.svg", 18, 18],
  "arrow-up-right": ["assets/icons/arrow-up-right.svg", 16, 16],
  "arrow-up-right-light": ["assets/icons/arrow-up-right-light.svg", 17, 17],
  bike: ["assets/icons/bike.svg", 14, 14],
  clock: ["assets/icons/clock.svg", 21, 21],
  cloud: ["assets/icons/cloud.svg", 24, 24],
  "cloud-rain": ["assets/icons/cloud-rain.svg", 24, 24],
  "cloud-sun": ["assets/icons/cloud-sun.svg", 24, 24],
  "cloud-sun-lg": ["assets/icons/cloud-sun-lg.svg", 48, 48],
  droplet: ["assets/icons/droplet.svg", 13, 13],
  footprints: ["assets/icons/footprints.svg", 14, 14],
  "footprints-lg": ["assets/icons/footprints-lg.svg", 21, 21],
  house: ["assets/icons/house.svg", 16, 16],
  "layout-grid": ["assets/icons/layout-grid.svg", 16, 16],
  "map-pin-muted": ["assets/icons/map-pin-muted.svg", 15, 15],
  "map-pin-sm": ["assets/icons/map-pin-sm.svg", 14, 14],
  navigation: ["assets/icons/navigation.svg", 16, 16],
  sort: ["assets/icons/sort.svg", 17, 17],
  ticket: ["assets/icons/ticket.svg", 21, 21],
  tram: ["assets/icons/tram.svg", 14, 14],
  trees: ["assets/icons/trees.svg", 16, 16],
};

const DAYS = [
  { id: 0, label: "Today" },
  { id: 1, label: "Tomorrow" },
  { id: 2, label: "In 2 days" },
];

const view = document.querySelector("#view");
const state = {
  setting: "all",
  activeId: "01",
  activeKey: null,
  day: 0,
};

let weather = { ...FALLBACK_WEATHER, hours: FALLBACK_WEATHER.hours.map((hour) => ({ ...hour })) };
let forecastPayload = { live: false };
let sourcePlaces = fallbackPlaces();
let ranked = [];
let mapHandle = null;

function icon(name, className = "") {
  const [src, width, height] = ICONS[name];
  return `<img class="${className}" src="${src}" width="${width}" height="${height}" alt="">`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

function passesSetting(activity, setting) {
  return setting === "all" || activity.setting === setting;
}

function visibleActivities() {
  return ranked.filter((activity) => passesSetting(activity, state.setting));
}

function countFor(setting) {
  return ranked.filter((activity) => passesSetting(activity, setting)).length;
}

function findPlace(key) {
  return ranked.find((activity) => activity.placeKey === key || activity.id === key) ?? null;
}

function rankActivities(list, report) {
  return list
    .map((activity) => ({
      ...activity,
      score: scoreActivity(activity, report),
      weatherNote: whyItFits(activity, report),
    }))
    .sort((a, b) => b.score - a.score)
    .map((activity, index) => {
      const id = String(index + 1).padStart(2, "0");
      const route = activity.routeLabel ? ` · ${activity.routeLabel} from Zürich HB` : "";
      return {
        ...activity,
        id,
        mapCaption: `${id} · ${activity.shortName}${route}`,
      };
    });
}

function applyRank() {
  ranked = rankActivities(sourcePlaces, weather);
  if (state.activeKey) {
    const match = ranked.find((activity) => activity.placeKey === state.activeKey);
    if (match) state.activeId = match.id;
  }
}

function parseRoute() {
  const hash = (location.hash.replace(/^#/, "") || "/").replace(/\/$/, "") || "/";
  if (hash === "/") return { name: "main" };
  const match = hash.match(/^\/activity\/([^/]+)$/);
  if (match) return { name: "detail", id: decodeURIComponent(match[1]) };
  return { name: "missing" };
}

function weatherMeta(report) {
  const parts = [];
  if (report.feelsLike != null) parts.push(`Feels like ${report.feelsLike}°`);
  if (report.wind != null) parts.push(`Wind ${report.wind} km/h`);
  return parts.join(" · ");
}

function currentIcon(report) {
  return report.icon === "cloud-sun" ? "cloud-sun-lg" : report.icon;
}

function forecastHeading() {
  if (!weather.live) return "Your afternoon";
  const upcoming = weather.hours.find((hour) => hour.label !== "Now")?.label ?? weather.timeLabel;
  const hour = Number(upcoming.slice(0, 2));
  if (hour < 12) return "This morning";
  if (hour < 17) return "Your afternoon";
  return "This evening";
}

function statusBlock() {
  return `
    <div class="status">
      <span class="badge-blue">${escapeHtml(weather.badge)}</span>
      <p>${escapeHtml(weather.sourceLine)}</p>
    </div>
  `;
}

function hourCells() {
  return weather.hours
    .map(
      (hour) => `
        <div class="hour${hour.label === "Now" || hour.current ? " is-now" : ""}${hour.rainy ? " is-rain" : ""}">
          <span>${escapeHtml(hour.label)}</span>
          ${icon(hour.icon)}
          <strong>${hour.temp}°</strong>
          <em>${hour.rain} %</em>
        </div>
      `,
    )
    .join("");
}

function dayPills() {
  return DAYS.map(
    (day) => `
      <button type="button" class="day-pill${state.day === day.id ? " is-active" : ""}" data-day="${day.id}">
        ${day.label}
      </button>
    `,
  ).join("");
}

function activityCard(activity) {
  const active = activity.id === state.activeId ? " is-active" : "";
  return `
    <a class="activity-card${active}" href="#/activity/${encodeURIComponent(activity.placeKey)}" data-activity="${activity.id}">
      <img class="card-photo" src="${activity.image}" alt="${escapeHtml(activity.title)}">
      <div class="card-body">
        <div class="card-top">
          <div class="card-kicker">
            <span class="card-index">${activity.id}</span>
            <span class="card-cat">${escapeHtml(activity.settingLabel)} · ${escapeHtml(activity.category)}</span>
          </div>
          <span class="card-price">${escapeHtml(activity.priceLabel)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(activity.title)}</h3>
        <p class="card-note">${escapeHtml(activity.weatherNote)}</p>
        <div class="card-meta">
          <span class="card-transit">${icon(activity.transitIcon)}${escapeHtml(activity.transit)}</span>
          ${icon("arrow-up-right")}
        </div>
      </div>
    </a>
  `;
}

function mapFrame(label, compact) {
  return `
    <div class="map-frame${compact ? " is-compact" : ""}">
      <div class="map-canvas" data-map></div>
      <div class="map-chip">${icon("map-pin-sm")}<span>${escapeHtml(label)}</span></div>
      <div class="map-compass">${icon("navigation")}<span>N</span></div>
    </div>
  `;
}

function renderMain() {
  const visible = visibleActivities();
  if (visible.length && !visible.some((activity) => activity.id === state.activeId)) {
    state.activeId = visible[0].id;
    state.activeKey = visible[0].placeKey;
  }
  const cards = visible.length
    ? visible.map(activityCard).join("")
    : `<p class="empty">No ideas match these filters.</p>`;
  const matched = weather.live
    ? ["today’s forecast", "tomorrow’s forecast", "the forecast in 2 days"][state.day]
    : "the demo forecast";
  const nearLabel = ["Near you today", "Near you tomorrow", "Near you in 2 days"][state.day];
  const ideaCount = visible.length === 1 ? "1 idea" : `${visible.length} ideas`;

  view.innerHTML = `
    <div class="stage">
      <section class="weather-block">
        <div class="intro">
          <div class="intro-copy">
            <p class="eyebrow">${escapeHtml(weather.dateLabel)}</p>
            <h1 class="page-title">What fits your day?</h1>
            <p class="lede">Check the weather. Explore Zürich. Find affordable ideas without a car.</p>
          </div>
          ${statusBlock()}
        </div>
        <article class="weather-card">
          <div class="weather-now">
            <div class="weather-place">
              <span>${escapeHtml(weather.place)}</span>
              <span>${escapeHtml(weather.timeLabel)}</span>
            </div>
            <div class="temp-row">
              ${icon(currentIcon(weather))}
              <p class="temp">${weather.temp}°</p>
              <div class="conditions">
                <strong>${escapeHtml(weather.condition)}</strong>
                <span>${escapeHtml(weatherMeta(weather))}</span>
              </div>
            </div>
            <p class="summary">${escapeHtml(weather.summary)}</p>
          </div>
          <div class="forecast">
            <div class="forecast-head">
              <div class="forecast-tools">
                <span>${forecastHeading()}</span>
                <div class="day-pills" role="group" aria-label="Forecast day">${dayPills()}</div>
              </div>
              <span class="rain-key">${icon("droplet")}Chance of rain</span>
            </div>
            <div class="hours">${hourCells()}</div>
          </div>
        </article>
      </section>
      <section class="discover">
        <div class="filters">
          <div class="filter-group" role="group" aria-label="Setting">
            <button type="button" class="filter-option${state.setting === "all" ? " is-active" : ""}" data-setting="all">
              ${icon("layout-grid", "icon-light")}All · ${countFor("all")}
            </button>
            <button type="button" class="filter-option${state.setting === "indoor" ? " is-active" : ""}" data-setting="indoor">
              ${icon("house", "icon-tint")}Indoor · ${countFor("indoor")}
            </button>
            <button type="button" class="filter-option${state.setting === "outdoor" ? " is-active" : ""}" data-setting="outdoor">
              ${icon("trees", "icon-tint")}Outdoor · ${countFor("outdoor")}
            </button>
          </div>
        </div>
        <div class="results-head">
          <div>
            <h2>${nearLabel}</h2>
            <p>${ideaCount} · routes from Zürich HB · matched to ${matched}</p>
          </div>
          <div class="sort"><span>Sorted by weather suitability</span>${icon("sort")}</div>
        </div>
        <div class="results">
          <div class="activity-list">${cards}</div>
          <div class="map-column">
            ${mapFrame("Around Zürich HB", false)}
            <div class="map-legend">
              <span class="map-legend-note">${icon("map-pin-sm")}Numbers link the map to the recommendations.</span>
              <span class="quiet">Illustrative selection of places</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  mountMap(visible, true);
}

function renderDetail(activity) {
  const glance = activity.glance
    .map(
      (row) => `
        <div class="glance-row">
          ${icon(row.icon)}
          <div class="glance-copy">
            <p class="glance-label">${escapeHtml(row.label)}</p>
            <p class="glance-value">${escapeHtml(row.value)}</p>
            <p class="glance-note">${escapeHtml(row.note)}</p>
          </div>
        </div>
      `,
    )
    .join("");
  const tips = activity.tips
    .map(
      (tip) => `
        <div>
          <h3>${escapeHtml(tip.title)}</h3>
          <p>${escapeHtml(tip.body)}</p>
        </div>
      `,
    )
    .join("");

  view.innerHTML = `
    <div class="stage-detail">
      <div class="orient">
        <div class="back-row">
          <a class="back" href="#/">${icon("arrow-left")}All activities</a>
          <span class="crumb">/ ${escapeHtml(activity.category)}</span>
        </div>
        ${statusBlock()}
      </div>
      <div class="detail-head">
        <div class="identity">
          <div class="detail-badges">
            <span class="badge-green">${activity.id} · ${escapeHtml(activity.settingLabel)}</span>
            <span class="badge-green">${escapeHtml(activity.category)}</span>
          </div>
          <h1 class="detail-title">${escapeHtml(activity.title)}</h1>
          <p class="address">${icon("map-pin-muted")}${escapeHtml(activity.address)}</p>
        </div>
        <p class="duration">${escapeHtml(activity.duration)}</p>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <div class="hero">
            <img src="${activity.hero}" alt="${escapeHtml(activity.title)}">
            <span class="hero-note">Illustrative AI-generated location image</span>
          </div>
          <section class="why">
            <h2>${icon("cloud-rain")}${["Why it fits today", "Why it fits tomorrow", "Why it fits in 2 days"][state.day]}</h2>
            <p>${escapeHtml(whyItFits(activity, weather))}</p>
            <div class="why-foot">
              <span>${escapeHtml(suggestionLine(activity, weather))}</span>
              <span class="fine">${escapeHtml(weather.detailSource)}</span>
            </div>
          </section>
          <section class="story">
            <h2>${escapeHtml(activity.headline)}</h2>
            <p>${escapeHtml(activity.description)}</p>
          </section>
          <div class="tips">${tips}</div>
        </div>
        <aside class="detail-side">
          <section class="glance">
            <h2>Your visit at a glance</h2>
            ${glance}
            <a class="visit-button" href="${activity.website}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(activity.actionLabel)}
              ${icon("arrow-up-right-light")}
            </a>
            <p class="disclaimer">A planning guide, not a booking. Admission and opening hours are not guaranteed.</p>
          </section>
          ${mapFrame("Central Zürich", true)}
          <p class="place-line">${icon("map-pin-sm")}${escapeHtml(activity.mapCaption)}</p>
        </aside>
      </div>
    </div>
  `;

  state.activeId = activity.id;
  state.activeKey = activity.placeKey;
  mountMap(ranked, false);
}

function renderMissing() {
  view.innerHTML = `
    <div class="stage">
      <div class="missing">
        <p>That activity is not in this Zürich set.</p>
        <p><a href="#/">Back to all activities</a></p>
      </div>
    </div>
  `;
}

function mountMap(places, hoverable) {
  const canvas = view.querySelector("[data-map]");
  if (!canvas) return;
  const active = places.some((place) => place.id === state.activeId) ? state.activeId : places[0]?.id;
  mapHandle = createMap(canvas, {
    places,
    activeId: active,
    hb: ZURICH_HB,
    onSelect: openActivity,
    onHover: hoverable ? highlight : null,
  });
  requestAnimationFrame(() => mapHandle?.resize());
}

function highlight(id) {
  const place = ranked.find((activity) => activity.id === id);
  if (!place || state.activeId === id) return;
  state.activeId = id;
  state.activeKey = place.placeKey;
  view.querySelectorAll("[data-activity]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.activity === id);
  });
  mapHandle?.setActive(id);
}

function openActivity(key) {
  const place = ranked.find((activity) => activity.placeKey === key || activity.id === key);
  const next = `#/activity/${encodeURIComponent(place?.placeKey || key)}`;
  if (location.hash !== next) location.hash = next;
}

function teardownMap() {
  mapHandle?.destroy();
  mapHandle = null;
}

function render() {
  teardownMap();
  const route = parseRoute();
  if (route.name === "detail") {
    const activity = findPlace(route.id);
    if (!activity) {
      renderMissing();
      return;
    }
    renderDetail(activity);
    return;
  }
  if (route.name === "missing") {
    renderMissing();
    return;
  }
  renderMain();
}

view.addEventListener("click", (event) => {
  const setting = event.target.closest("[data-setting]");
  if (setting) {
    state.setting = setting.dataset.setting;
    render();
    return;
  }

  const day = event.target.closest("[data-day]");
  if (day) {
    state.day = Number(day.dataset.day);
    weather = weatherForDay(forecastPayload, state.day);
    applyRank();
    render();
  }
});

view.addEventListener("mouseover", (event) => {
  const card = event.target.closest("[data-activity]");
  if (card) highlight(card.dataset.activity);
});

view.addEventListener("focusin", (event) => {
  const card = event.target.closest("[data-activity]");
  if (card) highlight(card.dataset.activity);
});

window.addEventListener("hashchange", () => {
  render();
});

applyRank();
render();

fetchPlaces().then((places) => {
  sourcePlaces = places;
  applyRank();
  render();
});

fetchWeather().then((payload) => {
  forecastPayload = payload;
  weather = weatherForDay(payload, state.day);
  applyRank();
  render();
});
