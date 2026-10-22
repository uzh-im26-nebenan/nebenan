import { activities, getActivity, ZURICH_HB } from "../data/activities.js";
import { createMap } from "./map.js";
import { FALLBACK_WEATHER, fetchWeather, suggestionLine, whyItFits } from "./weather.js";

const ICONS = {
  "arrow-left": ["assets/icons/arrow-left.svg", 18, 18],
  "arrow-up-right": ["assets/icons/arrow-up-right.svg", 16, 16],
  "arrow-up-right-light": ["assets/icons/arrow-up-right-light.svg", 17, 17],
  bike: ["assets/icons/bike.svg", 14, 14],
  "chevron-down": ["assets/icons/chevron-down.svg", 14, 14],
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
  leaf: ["assets/icons/leaf.svg", 15, 15],
  "map-pin-muted": ["assets/icons/map-pin-muted.svg", 15, 15],
  "map-pin-sm": ["assets/icons/map-pin-sm.svg", 14, 14],
  navigation: ["assets/icons/navigation.svg", 16, 16],
  sort: ["assets/icons/sort.svg", 17, 17],
  ticket: ["assets/icons/ticket.svg", 21, 21],
  tram: ["assets/icons/tram.svg", 14, 14],
  trees: ["assets/icons/trees.svg", 16, 16],
};

const BUDGETS = [
  { id: "any", label: "Any price" },
  { id: "free", label: "Free" },
  { id: "15", label: "Up to CHF 15" },
];

const view = document.querySelector("#view");
const state = {
  setting: "all",
  budget: "15",
  carFreeOnly: true,
  activeId: "01",
  menuOpen: false,
};

let weather = { ...FALLBACK_WEATHER, hours: FALLBACK_WEATHER.hours.map((hour) => ({ ...hour })) };
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

function passesShared(activity) {
  if (state.carFreeOnly && !activity.carFree) return false;
  if (state.budget === "free") return activity.priceValue === 0;
  if (state.budget === "15") return activity.priceValue <= 15;
  return true;
}

function passesSetting(activity, setting) {
  return setting === "all" || activity.setting === setting;
}

function visibleActivities() {
  return activities.filter((activity) => passesShared(activity) && passesSetting(activity, state.setting));
}

function countFor(setting) {
  return activities.filter((activity) => passesShared(activity) && passesSetting(activity, setting)).length;
}

function parseRoute() {
  const hash = (location.hash.replace(/^#/, "") || "/").replace(/\/$/, "") || "/";
  if (hash === "/") return { name: "main" };
  const match = hash.match(/^\/activity\/([^/]+)$/);
  if (match) return { name: "detail", id: decodeURIComponent(match[1]) };
  return { name: "missing" };
}

function weatherMeta(report) {
  if (report.feelsLike == null) return `Wind ${report.wind} km/h`;
  return `Feels like ${report.feelsLike}° · Wind ${report.wind} km/h`;
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
        <div class="hour${hour.label === "Now" ? " is-now" : ""}${hour.rainy ? " is-rain" : ""}">
          <span>${escapeHtml(hour.label)}</span>
          ${icon(hour.icon)}
          <strong>${hour.temp}°</strong>
          <em>${hour.rain} %</em>
        </div>
      `,
    )
    .join("");
}

function budgetMenu() {
  const current = BUDGETS.find((item) => item.id === state.budget) ?? BUDGETS[2];
  const options = BUDGETS.map(
    (item) => `
      <li>
        <button type="button" data-budget="${item.id}" role="option" aria-selected="${item.id === state.budget}">
          ${escapeHtml(item.label)}
        </button>
      </li>
    `,
  ).join("");
  return `
    <div class="price-menu">
      <button type="button" class="price-button" data-action="toggle-budget" aria-expanded="${state.menuOpen}" aria-haspopup="listbox">
        ${escapeHtml(current.label)}
        ${icon("chevron-down")}
      </button>
      <ul class="price-list" role="listbox" ${state.menuOpen ? "" : "hidden"}>
        ${options}
      </ul>
    </div>
  `;
}

function activityCard(activity) {
  const active = activity.id === state.activeId ? " is-active" : "";
  return `
    <a class="activity-card${active}" href="#/activity/${activity.id}" data-activity="${activity.id}">
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
  }
  const cards = visible.length
    ? visible.map(activityCard).join("")
    : `<p class="empty">No ideas match these filters.</p>`;
  const matched = weather.live ? "today’s forecast" : "the demo forecast";
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
              <span>${forecastHeading()}</span>
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
          <div class="filter-extra">
            ${budgetMenu()}
            <button type="button" class="car-chip" data-action="toggle-car" aria-pressed="${state.carFreeOnly}">
              ${icon("leaf")}Reachable without a car
            </button>
          </div>
        </div>
        <div class="results-head">
          <div>
            <h2>Near you today</h2>
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
        <p class="disclaimer">* CHF 10 is an example student price with student ID. Prices, opening hours and routes are estimates, not checked live. Public transport fares are not included.</p>
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
            <h2>${icon("cloud-rain")}Why it fits today</h2>
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
  mountMap(activities, false);
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
  if (!id || state.activeId === id) return;
  state.activeId = id;
  view.querySelectorAll("[data-activity]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.activity === id);
  });
  mapHandle?.setActive(id);
}

function openActivity(id) {
  const next = `#/activity/${id}`;
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
    const activity = getActivity(route.id);
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
    state.menuOpen = false;
    render();
    return;
  }

  const budget = event.target.closest("[data-budget]");
  if (budget) {
    state.budget = budget.dataset.budget;
    state.menuOpen = false;
    render();
    return;
  }

  if (event.target.closest("[data-action='toggle-budget']")) {
    state.menuOpen = !state.menuOpen;
    const list = view.querySelector(".price-list");
    const button = view.querySelector("[data-action='toggle-budget']");
    if (list) list.hidden = !state.menuOpen;
    if (button) button.setAttribute("aria-expanded", String(state.menuOpen));
    return;
  }

  if (event.target.closest("[data-action='toggle-car']")) {
    state.carFreeOnly = !state.carFreeOnly;
    state.menuOpen = false;
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

document.addEventListener("click", (event) => {
  if (event.target.closest(".price-menu")) return;
  state.menuOpen = false;
  const list = view.querySelector(".price-list");
  const button = view.querySelector("[data-action='toggle-budget']");
  if (list) list.hidden = true;
  if (button) button.setAttribute("aria-expanded", "false");
});

window.addEventListener("hashchange", () => {
  state.menuOpen = false;
  render();
});

render();
fetchWeather().then((report) => {
  if (!report.live) return;
  weather = report;
  render();
});
