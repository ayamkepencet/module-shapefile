// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/prompts.ts — the model-facing shapefile instructions.

export const SHAPEFILE_PROMPT = `## Shapefile (draw shapes on the map)
Use the shapefile tools whenever the user wants shapes drawn on the
OpenStreetMap Leaflet viewer: markers, circles, rectangles, polygons,
polylines or raw GeoJSON (e.g. converted from a .shp shapefile).

- shapefile_draw — create (or replace) a shape map and render it in the
  Viewer iframe. Takes a title, a list of shapes and optional center/zoom.
  Shapes are stored in maps/<slug>.shapes.json and the Leaflet HTML app in
  maps/<slug>.html; the HTML is regenerated from the JSON, never edited by hand.
- shapefile_add — append shapes to an existing shape map and re-render it.
- shapefile_clear — remove all shapes from an existing shape map.
- shapefile_list — list the shape maps currently in the workspace.

Shape coordinates are [latitude, longitude] decimal degrees. Circle radius is
in meters. A shape may carry a popup (HTML) and a style (color, weight,
opacity, fillColor, fillOpacity, dashArray, marker radius).

Shapefile rules:
- Always inline the shapes in the app; the viewer iframe must not load
  file:// URLs or call back into the Studio host.
- Tiles come from OpenStreetMap by default; keep the OSM attribution visible.
- Prefer shapefile_draw once with all shapes over many incremental calls,
  then shapefile_add only when the user asks to extend an existing map.`;

export const SHAPEFILE_ATTRIBUTION = [
  "© OpenStreetMap contributors (ODbL)",
  "Leaflet 1.9.4 (BSD-2-Clause)",
];
