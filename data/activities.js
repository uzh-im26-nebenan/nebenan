export const ZURICH_CENTER = { lat: 47.3769, lon: 8.5417 };

export const ZURICH_HB = {
  lat: 47.3782,
  lon: 8.5402,
  label: "Zürich HB",
};

export const activities = [
  {
    id: "01",
    title: "Swiss National Museum",
    shortName: "National Museum",
    setting: "indoor",
    settingLabel: "Indoor",
    category: "Culture & history",
    priceLabel: "CHF 10*",
    priceValue: 10,
    carFree: true,
    transitIcon: "footprints",
    transit: "4 min walk · 1–2 hours",
    routeLabel: "4 min",
    weatherNote: "Rain after 15:00? Stay dry here.",
    image: "assets/images/museum-card.jpg",
    hero: "assets/images/museum-hero.jpg",
    lat: 47.3794,
    lon: 8.5403,
    address: "Museumstrasse 2 · 8001 Zürich · next to the main station",
    duration: "Time for yourself: 1–2 hours",
    whyStatic:
      "The demo forecast shows a 75% chance of rain from 15:00 at 13 °C. The exhibitions are indoors, just a short walk from Zürich HB. A good plan for a rainy afternoon.",
    fitLive:
      "The exhibitions are indoors, just a short walk from Zürich HB. A good plan for a rainy afternoon.",
    fitLiveDry:
      "The exhibitions are indoors, just a short walk from Zürich HB, if the sky changes later.",
    suggestion: "Our suggestion: 14:30–16:30",
    headline: "A break from campus. A fresh perspective.",
    description:
      "From everyday life to Swiss history: explore the National Museum at your own pace. Take a study break with a friend or enjoy a quiet afternoon alone — no long journey and no weather worries.",
    tips: [
      {
        title: "Bring your student ID",
        body: "Check for student discounts at the venue. Bring a valid student ID.",
      },
      {
        title: "A quick green break first?",
        body: "03 · Platzspitz is right behind the museum. Check the rain forecast for a short walk before 14:00.",
      },
    ],
    glance: [
      {
        icon: "ticket",
        label: "Budget",
        value: "CHF 10 · example discounted price",
        note: "With student ID · check current prices before visiting.",
      },
      {
        icon: "clock",
        label: "Saturday opening hours",
        value: "10:00–17:00 · example hours",
        note: "Not checked live. Special opening hours may apply.",
      },
      {
        icon: "footprints-lg",
        label: "Climate-conscious travel",
        value: "4 min walk from Zürich HB",
        note: "About 300 m via Bahnhofplatz. No extra public transport ticket needed.",
      },
    ],
    actionLabel: "Check the museum website before visiting",
    website: "https://www.landesmuseum.ch",
    mapCaption: "01 · National Museum · north of Zürich HB",
  },
  {
    id: "02",
    title: "UZH Natural History Museum",
    shortName: "Natural History",
    setting: "indoor",
    settingLabel: "Indoor",
    category: "Nature & science",
    priceLabel: "Free",
    priceValue: 0,
    carFree: true,
    transitIcon: "tram",
    transit: "8 min by tram 6 · 1–2 hours",
    routeLabel: "8 min",
    weatherNote: "A warm escape on a chilly, rainy afternoon.",
    image: "assets/images/natural-history.jpg",
    hero: "assets/images/natural-history.jpg",
    lat: 47.375,
    lon: 8.5496,
    address: "Karl-Schmid-Strasse 4 · 8006 Zürich · university quarter",
    duration: "Time for yourself: 1–2 hours",
    whyStatic:
      "The demo forecast turns wet and cool after 15:00. The museum is indoors and free to enter, a short tram ride from Zürich HB. A warm place to spend a rainy afternoon.",
    fitLive:
      "The galleries are indoors and free to enter, eight minutes by tram 6 from Zürich HB. A warm place to spend a rainy afternoon.",
    fitLiveDry:
      "It is indoors if the weather turns, and free to enter. A calm stop in the university quarter.",
    suggestion: "Our suggestion: 15:00–17:00",
    headline: "A warm room for a wet afternoon.",
    description:
      "Bones, minerals and the story of life on earth, a few stops from the station. Stay as long as you like — admission in this guide is listed as free, and the hours are an example, not a live check.",
    tips: [
      {
        title: "No ticket in this example",
        body: "This demo lists the visit as free. Confirm on the museum site before you go.",
      },
      {
        title: "Pair it with a dry-hour walk",
        body: "If the morning stays dry, Platzspitz is on the way back toward Zürich HB.",
      },
    ],
    glance: [
      {
        icon: "ticket",
        label: "Budget",
        value: "Free · example admission",
        note: "Listed as free in this guide. Confirm before visiting.",
      },
      {
        icon: "clock",
        label: "Saturday opening hours",
        value: "10:00–17:00 · example hours",
        note: "Not checked live. Special opening hours may apply.",
      },
      {
        icon: "footprints-lg",
        label: "Climate-conscious travel",
        value: "8 min by tram 6 from Zürich HB",
        note: "Toward the university quarter. A public-transport ticket is not included.",
      },
    ],
    actionLabel: "Check the museum website before visiting",
    website: "https://www.zm.uzh.ch",
    mapCaption: "02 · Natural History Museum · university quarter",
  },
  {
    id: "03",
    title: "Autumn walk in Platzspitz",
    shortName: "Platzspitz",
    setting: "outdoor",
    settingLabel: "Outdoor",
    category: "Park & relaxation",
    priceLabel: "Free",
    priceValue: 0,
    carFree: true,
    transitIcon: "footprints",
    transit: "6 min walk · 30–45 min",
    routeLabel: "6 min",
    weatherNote: "Mostly dry until 14:00 – ideal for a short walk.",
    image: "assets/images/platzspitz.jpg",
    hero: "assets/images/platzspitz.jpg",
    lat: 47.3827,
    lon: 8.5405,
    address: "Platzspitz · 8001 Zürich · behind the National Museum",
    duration: "Time for yourself: 30–45 min",
    whyStatic:
      "The demo forecast stays mostly dry until 14:00. Platzspitz is a short walk from Zürich HB, where the Sihl meets the Limmat — a good loop before the rain.",
    fitLive:
      "Go before the rain builds. The park is a six-minute walk from Zürich HB, just behind the National Museum.",
    fitLiveDry:
      "The park is a six-minute walk from Zürich HB and a quiet stretch of green beside the rivers.",
    suggestion: "Our suggestion: before 14:00",
    headline: "Rivers, plane trees, and a short loop.",
    description:
      "Platzspitz sits where the Sihl meets the Limmat, just behind the National Museum. A quiet walk from the station — no ticket and no queue in this guide.",
    tips: [
      {
        title: "Shoes for the paths",
        body: "Gravel and fallen leaves are part of the walk. It is an outdoor plan, so watch the hourly rain chance.",
      },
      {
        title: "An indoor backup next door",
        body: "01 · Swiss National Museum is beside the park if the rain arrives earlier than expected.",
      },
    ],
    glance: [
      {
        icon: "ticket",
        label: "Budget",
        value: "Free",
        note: "A public park. No admission in this example.",
      },
      {
        icon: "clock",
        label: "Access",
        value: "Open daily · example",
        note: "Not checked live. Paths may close for events or maintenance.",
      },
      {
        icon: "footprints-lg",
        label: "Climate-conscious travel",
        value: "6 min walk from Zürich HB",
        note: "Through the station district. No public transport ticket needed.",
      },
    ],
    actionLabel: "Check park access before you go",
    website: "https://www.stadt-zuerich.ch",
    mapCaption: "03 · Platzspitz · behind the National Museum",
  },
  {
    id: "04",
    title: "Along the Schanzengraben",
    shortName: "Schanzengraben",
    setting: "outdoor",
    settingLabel: "Outdoor",
    category: "City & water",
    priceLabel: "Free",
    priceValue: 0,
    carFree: true,
    transitIcon: "bike",
    transit: "5 min by bike · 45 min",
    routeLabel: "5 min",
    weatherNote: "Make the most of the dry spell before the rain.",
    image: "assets/images/schanzengraben.jpg",
    hero: "assets/images/schanzengraben.jpg",
    lat: 47.3716,
    lon: 8.5348,
    address: "Schanzengraben · 8001 Zürich · west of the old town",
    duration: "Time for yourself: 45 min",
    whyStatic:
      "The demo forecast leaves a dry spell before the rain. The Schanzengraben path is a short bike ride from Zürich HB along the old moat.",
    fitLive:
      "Use the dry spell before the rain. The waterside path is about five minutes by bike from Zürich HB.",
    fitLiveDry:
      "The waterside path is about five minutes by bike from Zürich HB, along the old moat west of the old town.",
    suggestion: "Our suggestion: while the afternoon is still dry",
    headline: "The old moat, before the rain.",
    description:
      "A flat waterside path around the western edge of the old town. Five minutes by bike from Zürich HB — best while the afternoon is still dry.",
    tips: [
      {
        title: "The path is narrow in places",
        body: "Walkers and bikes share the moat path. Give yourself room and a light layer if the wind picks up.",
      },
      {
        title: "If the rain starts",
        body: "01 · Swiss National Museum is the indoor alternative, a short ride back toward Zürich HB.",
      },
    ],
    glance: [
      {
        icon: "ticket",
        label: "Budget",
        value: "Free",
        note: "A public path. No admission in this example.",
      },
      {
        icon: "clock",
        label: "Access",
        value: "Open daily · example",
        note: "Not checked live. Sections may be closed after heavy rain.",
      },
      {
        icon: "footprints-lg",
        label: "Climate-conscious travel",
        value: "5 min by bike from Zürich HB",
        note: "A short ride toward the old town. No public transport ticket needed.",
      },
    ],
    actionLabel: "Check the route before you go",
    website: "https://www.stadt-zuerich.ch",
    mapCaption: "04 · Schanzengraben · west of the old town",
  },
];

export function getActivity(id) {
  return activities.find((activity) => activity.id === id) ?? null;
}
