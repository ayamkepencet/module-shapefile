// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/shapes.ts — shape validation and normalization.
//
// Pure functions: no DOM, no fetch, no core imports, so they run unchanged in
// the agent (browser), in the module Surface and in node --test.

import { z } from "zod";

import type { LatLng, ShapeMapDoc, ShapeSpec } from "./types.ts";

const latLngSchema: z.ZodType<LatLng> = z
  .tuple([z.number(), z.number()])
  .refine(
    ([lat, lng]) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180,
    "lat/lng out of range: expected [lat -90..90, lng -180..180]",
  ) as z.ZodType<LatLng>;

const styleSchema = z
  .object({
    color: z.string().optional(),
    weight: z.number().positive().optional(),
    opacity: z.number().min(0).max(1).optional(),
    fillColor: z.string().optional(),
    fillOpacity: z.number().min(0).max(1).optional(),
    dashArray: z.string().optional(),
    radius: z.number().positive().optional(),
  })
  .partial()
  .optional();

const baseSchema = z.object({
  popup: z.string().max(2000).optional(),
  style: styleSchema,
});

export const shapeSpecSchema: z.ZodType<ShapeSpec> = z.discriminatedUnion("type", [
  baseSchema.extend({ type: z.literal("marker"), position: latLngSchema }),
  baseSchema.extend({
    type: z.literal("circle"),
    center: latLngSchema,
    radiusMeters: z.number().positive().max(20_000_000),
  }),
  baseSchema.extend({
    type: z.literal("rectangle"),
    bounds: z.tuple([latLngSchema, latLngSchema]),
  }),
  baseSchema.extend({
    type: z.literal("polyline"),
    positions: z.array(latLngSchema).min(2),
  }),
  baseSchema.extend({
    type: z.literal("polygon"),
    positions: z.array(latLngSchema).min(3),
  }),
  baseSchema.extend({ type: z.literal("geojson"), geojson: z.unknown() }),
]) as z.ZodType<ShapeSpec>;

export const shapeMapDocSchema: z.ZodType<ShapeMapDoc> = z.object({
  title: z.string().min(1).max(120),
  shapes: z.array(shapeSpecSchema),
  config: z
    .object({
      tileUrl: z.string().url().optional(),
      attribution: z.string().max(500).optional(),
      center: latLngSchema.optional(),
      zoom: z.number().int().min(0).max(22).optional(),
    })
    .partial()
    .optional()
    .transform((config) => config ?? {}),
}) as z.ZodType<ShapeMapDoc>;

export class ShapefileError extends Error {}

/** Validate and normalize one raw shape; throws ShapefileError with a hint. */
export function normalizeShape(raw: unknown, index = 0): ShapeSpec {
  const result = shapeSpecSchema.safeParse(raw);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const where = first.path.length ? ` at ${first.path.join(".")}` : "";
  throw new ShapefileError(`shapes[${index}]${where}: ${first.message}`);
}

/** Validate and normalize a whole map document read from a sidecar. */
export function normalizeDoc(raw: unknown): ShapeMapDoc {
  const result = shapeMapDocSchema.safeParse(raw);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const where = first.path.length ? ` at ${first.path.join(".")}` : "";
  throw new ShapefileError(`invalid shape map document${where}: ${first.message}`);
}

/** Lowercase hyphenated slug, same rule as the core map catalogue. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** One-line per-shape summary for tool results and traces. */
export function describeShape(shape: ShapeSpec): string {
  switch (shape.type) {
    case "marker":
      return `marker ${shape.position.join(",")}`;
    case "circle":
      return `circle ${shape.center.join(",")} r=${shape.radiusMeters}m`;
    case "rectangle":
      return `rectangle ${shape.bounds.map((b) => b.join(",")).join(" / ")}`;
    case "polyline":
      return `polyline ${shape.positions.length} pts`;
    case "polygon":
      return `polygon ${shape.positions.length} pts`;
    case "geojson":
      return `geojson ${(shape.geojson as { type?: string })?.type ?? "object"}`;
  }
}
