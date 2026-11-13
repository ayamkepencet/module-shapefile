// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// @tablette/module-shapefile — public entry.

export { shapefileModule } from "./module.ts";

export { createShapefileTools } from "./tools.ts";

export { SHAPEFILE_ATTRIBUTION, SHAPEFILE_PROMPT } from "./prompts.ts";

export {
  LEAFLET_CDN,
  LEAFLET_VERSION,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  defaultConfig,
  jsonForScript,
  renderMapHtml,
} from "./render.ts";

export {
  ShapefileError,
  describeShape,
  normalizeDoc,
  normalizeShape,
  shapeMapDocSchema,
  shapeSpecSchema,
  slugify,
} from "./shapes.ts";

export type {
  CircleShape,
  GeoJsonShape,
  LatLng,
  MarkerShape,
  PolygonShape,
  PolylineShape,
  RectangleShape,
  ShapeBase,
  ShapeMapConfig,
  ShapeMapDoc,
  ShapeSpec,
  ShapeStyle,
} from "./types.ts";
