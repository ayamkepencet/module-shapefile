// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/types.ts — shape and map document types.
//
// A ShapeMapDoc is the sidecar stored next to the rendered app as
// maps/<slug>.shapes.json; the HTML app is always regenerated from it, so the
// doc is the editable source of truth and the .html is a build artifact.

/** [latitude, longitude] in decimal degrees. */
export type LatLng = [number, number];

export interface ShapeStyle {
  /** Stroke color, e.g. "#2563eb". */
  color?: string;
  /** Stroke width in pixels. */
  weight?: number;
  /** Stroke opacity 0-1. */
  opacity?: number;
  /** Fill color for circle/rectangle/polygon. */
  fillColor?: string;
  /** Fill opacity 0-1. */
  fillOpacity?: number;
  /** Dash pattern, e.g. "5 5". */
  dashArray?: string;
  /** Marker radius in pixels (marker only). */
  radius?: number;
}

export interface ShapeBase {
  /** Optional HTML popup bound to the layer. */
  popup?: string;
  style?: ShapeStyle;
}

export interface MarkerShape extends ShapeBase {
  type: "marker";
  position: LatLng;
}

export interface CircleShape extends ShapeBase {
  type: "circle";
  center: LatLng;
  /** Radius in meters. */
  radiusMeters: number;
}

export interface RectangleShape extends ShapeBase {
  type: "rectangle";
  /** [[south, west], [north, east]]. */
  bounds: [LatLng, LatLng];
}

export interface PolylineShape extends ShapeBase {
  type: "polyline";
  positions: LatLng[];
}

export interface PolygonShape extends ShapeBase {
  type: "polygon";
  positions: LatLng[];
}

export interface GeoJsonShape extends ShapeBase {
  type: "geojson";
  /** Any GeoJSON object: geometry, Feature or FeatureCollection. */
  geojson: unknown;
}

export type ShapeSpec =
  | MarkerShape
  | CircleShape
  | RectangleShape
  | PolylineShape
  | PolygonShape
  | GeoJsonShape;

export interface ShapeMapConfig {
  /** Tile URL template; defaults to the OSM tile server. */
  tileUrl?: string;
  /** Tile attribution HTML; defaults to the OSM attribution. */
  attribution?: string;
  /** Initial view center; when omitted the map fits the shapes. */
  center?: LatLng;
  /** Initial zoom; used with center, otherwise fitBounds is used. */
  zoom?: number;
}

export interface ShapeMapDoc {
  title: string;
  shapes: ShapeSpec[];
  config: ShapeMapConfig;
}
