function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

function pinIcon(place, active) {
  const name = active ? `<span class="pin-name">${escapeHtml(place.shortName)}</span>` : "";
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin-stack"><div class="pin${active ? " is-active" : ""}">${place.id}</div>${name}</div>`,
    iconSize: active ? [200, 34] : [34, 34],
    iconAnchor: [17, 17],
  });
}

function stationIcon() {
  return L.divIcon({
    className: "hb-wrap",
    html: `<div class="hb-pill"><img src="assets/icons/train.svg" width="13" height="13" alt="">Zürich HB</div>`,
    iconSize: [108, 28],
    iconAnchor: [54, 14],
  });
}

function routeIcon(label) {
  return L.divIcon({
    className: "route-wrap",
    html: `<div class="route-label">${escapeHtml(label)}</div>`,
    iconSize: [48, 20],
    iconAnchor: [24, 10],
  });
}

export function createMap(container, { places, activeId, hb, onSelect, onHover }) {
  if (typeof L === "undefined") {
    container.innerHTML = `<p class="map-fallback">Map tiles need a network connection.</p>`;
    return { setActive() {}, resize() {}, destroy() {} };
  }

  const map = L.map(container, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([47.3769, 8.5417], 14);

  map.zoomControl.setPosition("bottomright");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  if (map.attributionControl) map.attributionControl.setPosition("bottomleft");

  const markers = new Map();
  let routeLine = null;
  let routeMarker = null;

  L.marker([hb.lat, hb.lon], { icon: stationIcon(), interactive: false, keyboard: false }).addTo(map);

  places.forEach((place) => {
    const marker = L.marker([place.lat, place.lon], {
      icon: pinIcon(place, place.id === activeId),
      zIndexOffset: place.id === activeId ? 800 : 0,
      title: place.title,
    }).addTo(map);
    marker.on("click", () => onSelect(place.placeKey || place.id));
    if (onHover) marker.on("mouseover", () => onHover(place.id));
    markers.set(place.id, { marker, place });
  });

  function clearRoute() {
    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }
    if (routeMarker) {
      map.removeLayer(routeMarker);
      routeMarker = null;
    }
  }

  function drawRoute(id) {
    clearRoute();
    const entry = markers.get(id);
    if (!entry) return;
    const { place } = entry;
    routeLine = L.polyline(
      [
        [hb.lat, hb.lon],
        [place.lat, place.lon],
      ],
      { color: "#245b45", weight: 3, dashArray: "1 7", lineCap: "round" },
    ).addTo(map);
    routeMarker = L.marker([(hb.lat + place.lat) / 2, (hb.lon + place.lon) / 2], {
      icon: routeIcon(place.routeLabel),
      interactive: false,
      keyboard: false,
      zIndexOffset: 400,
    }).addTo(map);
  }

  function fit() {
    if (!places.length) {
      map.setView([47.3769, 8.5417], 14);
      return;
    }
    const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lon]));
    bounds.extend([hb.lat, hb.lon]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }

  drawRoute(activeId);
  fit();

  return {
    setActive(id) {
      markers.forEach(({ marker, place }) => {
        const active = place.id === id;
        marker.setIcon(pinIcon(place, active));
        marker.setZIndexOffset(active ? 800 : 0);
      });
      drawRoute(id);
    },
    resize() {
      map.invalidateSize();
      fit();
    },
    destroy() {
      map.remove();
    },
  };
}
