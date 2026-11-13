// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/render.ts — render a ShapeMapDoc to a
// single-file static Leaflet app.
//
// Same shape as the core composer output: one HTML document, pinned Leaflet
// from the CDN, OSM tiles, the shapes inlined as JSON and a small bootstrap
// that maps each shape to a Leaflet layer. The Studio viewer renders this file
// in its sandboxed srcdoc iframe, so everything must be inline or https.

import type { ShapeMapConfig, ShapeMapDoc } from "./types.ts";

export const LEAFLET_VERSION = "1.9.4";

export const LEAFLET_CDN = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist`;

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** JSON safe to inline in a <script> element. */
export function jsonForScript(value: unknown): string {
  const BS = String.fromCharCode(92); // backslash, without escape-literal ambiguity
  return JSON.stringify(value, null, 2)
    .replace(/</g, BS + "u003c")
    .replace(/>/g, BS + "u003e")
    .replace(/\u2028/g, BS + "u2028")
    .replace(/\u2029/g, BS + "u2029");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BASE_CSS = `:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
html,
body,
#map {
  height: 100%;
  margin: 0;
}
body {
  background: #dfe9df;
  color: #1f2933;
}
.app-title {
  position: absolute;
  z-index: 500;
  top: 1rem;
  left: 3.75rem;
  max-width: min(22rem, calc(100% - 4.75rem));
  background: rgba(255, 255, 255, 0.94);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
}
.app-title h1 {
  margin: 0;
  font-size: 1.1rem;
}
`;

const APP_SCRIPT = `function pathStyle(style) {
  const s = style || {};
  const out = {};
  if (s.color) out.color = s.color;
  if (s.weight) out.weight = s.weight;
  if (s.opacity !== undefined) out.opacity = s.opacity;
  if (s.fillColor) out.fillColor = s.fillColor;
  if (s.fillOpacity !== undefined) out.fillOpacity = s.fillOpacity;
  if (s.dashArray) out.dashArray = s.dashArray;
  return out;
}

const map = L.map("map");
if (CONFIG.center) {
  map.setView(CONFIG.center, CONFIG.zoom ?? 13);
} else {
  map.setView([20, 0], 2);
}

L.tileLayer(CONFIG.tileUrl, {
  maxZoom: 19,
  attribution: CONFIG.attribution,
}).addTo(map);

const layers = [];
for (const shape of SHAPES) {
  const style = shape.style || {};
  let layer = null;
  if (shape.type === "marker") {
    layer = L.marker(shape.position, style.radius ? { radius: style.radius } : {});
  } else if (shape.type === "circle") {
    layer = L.circle(shape.center, Object.assign({ radius: shape.radiusMeters }, pathStyle(style)));
  } else if (shape.type === "rectangle") {
    layer = L.rectangle(shape.bounds, pathStyle(style));
  } else if (shape.type === "polyline") {
    layer = L.polyline(shape.positions, pathStyle(style));
  } else if (shape.type === "polygon") {
    layer = L.polygon(shape.positions, pathStyle(style));
  } else if (shape.type === "geojson") {
    layer = L.geoJSON(shape.geojson, { style: pathStyle(style) });
  }
  if (layer) {
    if (shape.popup) layer.bindPopup(shape.popup);
    layer.addTo(map);
    layers.push(layer);
  }
}

if (!CONFIG.center && layers.length) {
  map.fitBounds(L.featureGroup(layers).getBounds().pad(0.1));
}
`;

export function defaultConfig(): Required<Pick<ShapeMapConfig, "tileUrl" | "attribution">> {
  return { tileUrl: OSM_TILE_URL, attribution: OSM_ATTRIBUTION };
}

/** Render one HTML document for the given shape map. */
export function renderMapHtml(doc: ShapeMapDoc): string {
  const config = { ...defaultConfig(), ...doc.config };
  const title = escapeHtml(doc.title);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="${LEAFLET_CDN}/leaflet.css" />
    <style>${BASE_CSS}</style>
  </head>
  <body>
    <div id="map"></div>
    <div class="app-title"><h1>${title}</h1></div>
    <script src="${LEAFLET_CDN}/leaflet.js"></script>
    <script>
const CONFIG = ${jsonForScript(config)};
const SHAPES = ${jsonForScript(doc.shapes)};
${APP_SCRIPT}
    </script>
  </body>
</html>
`;
}
