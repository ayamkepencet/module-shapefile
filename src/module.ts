// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/module.ts — the Shapefile Studio module descriptor.
//
// Contributes the shape-drawing agent tools, a prompt section, OSM/Leaflet
// attribution and a small surface. Available in the Map (sketch) mode, where
// the Viewer iframe renders the generated Leaflet app.

import type { StudioModule } from "@tablette/module-sdk";

import { createShapefileTools } from "./tools.ts";

import { SHAPEFILE_ATTRIBUTION, SHAPEFILE_PROMPT } from "./prompts.ts";

import { LEAFLET_CDN, OSM_ATTRIBUTION, OSM_TILE_URL } from "./render.ts";

import { ShapefileSurface } from "./SurfaceLoader.ts";

export const shapefileModule: StudioModule = {
  id: "shapefile",
  label: "Shapefile",
  description:
    "Draw shapes (markers, circles, rectangles, polygons, polylines, GeoJSON) on the OpenStreetMap Leaflet viewer.",
  version: "0.1.0",
  docs: "https://tablette.bimr.net/modules/shapefile",
  modes: ["sketch"],
  defaultEnabled: true,
  dataSources: [
    {
      id: "osm-tiles",
      label: "OpenStreetMap tiles",
      endpoint: OSM_TILE_URL,
      auth: "none",
      cors: false,
      methods: ["GET"],
      license: "ODbL 1.0",
      licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      attribution: "© OpenStreetMap contributors",
    },
    {
      id: "leaflet-cdn",
      label: "Leaflet (unpkg CDN)",
      endpoint: LEAFLET_CDN,
      auth: "none",
      cors: true,
      methods: ["GET"],
      license: "BSD-2-Clause",
      licenseUrl: "https://github.com/Leaflet/Leaflet/blob/main/LICENSE",
      attribution: "Leaflet © Vladimir Agafonkin, Automattic",
    },
  ],
  attribution: [OSM_ATTRIBUTION, ...SHAPEFILE_ATTRIBUTION],
  prompt: SHAPEFILE_PROMPT,
  createTools: (ctx) => createShapefileTools(ctx),
  Surface: ShapefileSurface,
};
