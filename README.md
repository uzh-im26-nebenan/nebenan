# nebenan. Zürich — Weather-Aware Activity Recommender

Prototype for a student climate and micro-tourism guide in Zürich. It suggests nearby indoor and outdoor places that fit the weather, starting from Zürich HB.

## Key features

- Dynamic OpenStreetMap place retrieval via the Overpass API
- Real-time weather forecasting via Open-Meteo
- Automated weather-suitability scoring and ranking
- Interactive Leaflet.js map with route indicators from Zürich HB
- Date selection across today, tomorrow, and in 2 days
- 100% static, client-side architecture with zero backend requirement

The page shows four illustrative Zürich activities immediately. If Overpass answers, those cards are replaced by named places around Zürich HB. A second public Overpass server is tried when the first does not answer. If both that and Open-Meteo cannot be reached, the sample activities and the demo forecast stay so the screen is never blank.

## How to run

ES modules do not run from a `file://` address in current browsers, so open the app through a static file server.

```bash
python3 -m http.server 8000
```

Then visit `http://127.0.0.1:8000/`.

Alternatively:

```bash
npx serve .
```

Opening `index.html` directly will not load the modules.

## Project structure

```text
index.html              Shell: navigation, view mount, footer
css/style.css           Design tokens and both screens
js/app.js               Hash router, filters, date selection, ranking
js/places.js            Overpass fetch and place normalization
js/weather.js           Open-Meteo fetch, day slices, suitability scores
js/map.js               Leaflet map, numbered pins, route from Zürich HB
data/activities.js      Static fallback activities
assets/                 Icons and location photos from the Figma file
```

Routes are `#/` for the overview and `#/activity/:id` for a place.

## License

MIT. See [LICENSE](LICENSE).
