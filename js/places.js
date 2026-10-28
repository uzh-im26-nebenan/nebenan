import { activities, ZURICH_HB } from "../data/activities.js";

const OVERPASS_URLS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const QUERY = `[out:json][timeout:8];
(
  node["tourism"="museum"](around:2000, 47.3779, 8.5402);
  node["amenity"="arts_centre"](around:2000, 47.3779, 8.5402);
  node["amenity"="library"](around:2000, 47.3779, 8.5402);
  node["leisure"="park"](around:2000, 47.3779, 8.5402);
  node["leisure"="garden"](around:2000, 47.3779, 8.5402);
  node["tourism"="viewpoint"](around:2000, 47.3779, 8.5402);
);
out body 30;`;

const PHOTOS = {
  museum: {
    image: "assets/images/museum-card.jpg",
    hero: "assets/images/museum-hero.jpg",
  },
  culture: {
    image: "assets/images/natural-history.jpg",
    hero: "assets/images/museum-hero.jpg",
  },
  park: {
    image: "assets/images/platzspitz.jpg",
    hero: "assets/images/platzspitz.jpg",
  },
  water: {
    image: "assets/images/schanzengraben.jpg",
    hero: "assets/images/schanzengraben.jpg",
  },
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function distanceFromHb(lat, lon) {
  const earth = 6371000;
  const dLat = toRadians(lat - ZURICH_HB.lat);
  const dLon = toRadians(lon - ZURICH_HB.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(ZURICH_HB.lat)) * Math.cos(toRadians(lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function classify(tags) {
  if (tags.leisure === "park" || tags.leisure === "garden") {
    return { setting: "outdoor", category: "Park & Green", photos: PHOTOS.park };
  }
  if (tags.tourism === "viewpoint") {
    return { setting: "outdoor", category: "Viewpoint", photos: PHOTOS.water };
  }
  if (tags.amenity === "library") {
    return { setting: "indoor", category: "Library", photos: PHOTOS.culture };
  }
  if (tags.amenity === "arts_centre") {
    return { setting: "indoor", category: "Culture & Arts", photos: PHOTOS.culture };
  }
  return { setting: "indoor", category: "Museum", photos: PHOTOS.museum };
}

function safeWebsite(value) {
  if (typeof value !== "string" || !value.trim()) return "https://www.zuerich.com";
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    /* OpenStreetMap sometimes stores a bare domain. */
  }
  return "https://www.zuerich.com";
}

function shortLabel(title) {
  return title.length > 22 ? `${title.slice(0, 20)}…` : title;
}

export function normalizeOsmNode(node, index) {
  const tags = node.tags || {};
  const title = tags.name || tags["name:en"] || "Zürich Point of Interest";
  const kind = classify(tags);
  const meters = distanceFromHb(node.lat, node.lon);
  const walkingMin = Math.max(1, Math.round(meters / 80));
  const outdoor = kind.setting === "outdoor";
  const street = tags["addr:street"];
  const house = tags["addr:housenumber"] || "";
  const address = street ? `${street} ${house}`.replace(/\s+/g, " ").trim() : "Central Zürich";
  const priceLabel = outdoor ? "Free" : "Check venue";

  return {
    id: String(index + 1).padStart(2, "0"),
    placeKey: `osm-${node.id}`,
    title,
    shortName: shortLabel(title),
    setting: kind.setting,
    settingLabel: outdoor ? "Outdoor" : "Indoor",
    category: kind.category,
    priceLabel,
    priceValue: outdoor ? 0 : null,
    carFree: true,
    transitIcon: "footprints",
    transit: `${walkingMin} min walk`,
    routeLabel: `${walkingMin} min`,
    distanceMeters: meters,
    weatherNote: outdoor
      ? "Ranked from the forecast and the walk from Zürich HB."
      : "A nearby indoor option if the weather turns.",
    image: kind.photos.image,
    hero: kind.photos.hero,
    lat: node.lat,
    lon: node.lon,
    address,
    duration: `About ${walkingMin} min on foot`,
    whyStatic: outdoor
      ? `${title} is about a ${walkingMin}-minute walk from Zürich HB. This demo has no live forecast, so check the sky before you go.`
      : `${title} is indoors, about a ${walkingMin}-minute walk from Zürich HB. A straightforward backup when the afternoon turns wet.`,
    suggestion: "Our suggestion: check the forecast before you leave",
    headline: outdoor ? "A nearby outdoor stop." : "A nearby indoor stop.",
    description: `${title} comes from OpenStreetMap, about ${meters} m from Zürich HB. Hours and admission are not checked live.`,
    tips: [
      {
        title: "Weather first",
        body: "The list is ordered by how well this place fits the forecast for the day you picked.",
      },
      {
        title: "Confirm the details",
        body: "The address and website come from OpenStreetMap and can be incomplete.",
      },
    ],
    glance: [
      {
        icon: "ticket",
        label: "Budget",
        value: priceLabel,
        note: outdoor
          ? "Public outdoor place. No admission in this guide."
          : "Price is not listed in OpenStreetMap. Check the venue before you go.",
      },
      {
        icon: "clock",
        label: "Visit window",
        value: "Check before you go",
        note: "Opening hours are not verified live.",
      },
      {
        icon: "footprints-lg",
        label: "Climate-conscious travel",
        value: `${walkingMin} min walk from Zürich HB`,
        note: `About ${meters} m from the station. No extra public transport ticket in this guide.`,
      },
    ],
    actionLabel: "Visit venue website",
    website: safeWebsite(tags.website || tags["contact:website"]),
    mapCaption: `${title} · ${walkingMin} min from Zürich HB`,
  };
}

export function fallbackPlaces() {
  return activities.map((activity) => ({
    ...activity,
    placeKey: activity.placeKey || `static-${activity.id}`,
    distanceMeters: distanceFromHb(activity.lat, activity.lon),
    carFree: activity.carFree !== false,
  }));
}

function namedNodes(data) {
  const seen = new Set();
  return (data.elements || []).filter((element) => {
    if (element.type !== "node" || !element.tags) return false;
    if (!element.tags.name && !element.tags["name:en"]) return false;
    if (!Number.isFinite(element.lat) || !Number.isFinite(element.lon)) return false;
    if (seen.has(element.id)) return false;
    seen.add(element.id);
    return true;
  });
}

async function requestOverpass(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: QUERY,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPlaces() {
  for (const url of OVERPASS_URLS) {
    try {
      const nodes = namedNodes(await requestOverpass(url));
      if (nodes.length) return nodes.map((node, index) => normalizeOsmNode(node, index));
    } catch {
      /* The first server is usually quick. The second is the backup. */
    }
  }
  return fallbackPlaces();
}
