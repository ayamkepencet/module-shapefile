// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/tools.ts — agent tools for drawing shapes.
//
// The tools never touch the network: they validate shapes, render the
// single-file Leaflet app, write it (plus a JSON sidecar) into the workspace
// and ask the host to render the active document in the Viewer iframe via
// ctx.runApp(). All host capabilities come from ModuleContext, so the module
// stays testable in Node with a stub context.

import { tool } from "ai";

import { z } from "zod";

import type { ModuleContext } from "@tablette/module-sdk";

import { renderMapHtml } from "./render.ts";

import { ShapefileError, describeShape, normalizeDoc, normalizeShape, slugify } from "./shapes.ts";

import type { ShapeMapDoc, ShapeSpec } from "./types.ts";

const shapesInput = z
  .array(z.unknown())
  .max(500)
  .describe(
    "Shape list. Each item: { type: marker|circle|rectangle|polyline|polygon|geojson, ... } with [lat,lng] coordinates, optional popup and style.",
  );

function errorText(error: unknown): string {
  if (error instanceof ShapefileError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

function sidecarPath(map: string): string {
  if (map.endsWith(".shapes.json")) return map;
  if (map.endsWith(".html")) return map.replace(/\.html$/, ".shapes.json");
  return `maps/${map}.shapes.json`;
}

interface RenderedMap {
  ok: boolean;
  htmlPath: string;
  jsonPath: string;
  chars: number;
  doc: ShapeMapDoc;
}

async function renderAndRun(
  ctx: ModuleContext,
  slug: string,
  doc: ShapeMapDoc,
): Promise<RenderedMap> {
  if (!ctx.workspace) throw new ShapefileError("host did not provide workspace access");
  const html = renderMapHtml(doc);
  const jsonPath = `maps/${slug}.shapes.json`;
  const outHtmlPath = `maps/${slug}.html`;
  await ctx.workspace.writeFile(jsonPath, `${JSON.stringify(doc, null, 2)}\n`);
  await ctx.workspace.writeFile(outHtmlPath, html);
  await ctx.workspace.openFile(outHtmlPath);
  const ok = ctx.runApp ? ctx.runApp() : false;
  ctx.markRun?.(ok);
  return { ok, htmlPath: outHtmlPath, jsonPath, chars: html.length, doc };
}

function summarize(result: RenderedMap): string {
  const lines = result.doc.shapes.map(describeShape);
  return [
    result.ok
      ? `shape map rendered in the Viewer: ${result.doc.title}`
      : `shape map written but the Viewer did not render it (ok=false): ${result.doc.title}`,
    `workspace app: ${result.htmlPath}`,
    `shapes sidecar: ${result.jsonPath}`,
    `shapes: ${result.doc.shapes.length} · html: ${result.chars} chars`,
    ...(lines.length ? [`- ${lines.join("\n- ")}`] : []),
  ].join("\n");
}

export function createShapefileTools(ctx: ModuleContext) {
  return {
    shapefile_draw: tool({
      description:
        "Draw shapes on the OpenStreetMap Leaflet viewer. Creates (or replaces) a shape map: renders a single-file Leaflet HTML app into maps/<slug>.html, stores the shapes in maps/<slug>.shapes.json and shows the app in the Studio Viewer iframe.",
      inputSchema: z.object({
        title: z.string().min(1).max(120).describe("Map title; also derives the file slug"),
        shapes: shapesInput,
        center: z
          .tuple([z.number(), z.number()])
          .optional()
          .describe("Optional [lat,lng] initial center; when omitted the map fits the shapes"),
        zoom: z.number().int().min(0).max(22).optional().describe("Initial zoom when center is given"),
        tileUrl: z.string().url().optional().describe("Tile URL template; defaults to OSM tiles"),
      }),
      execute: async ({ title, shapes, center, zoom, tileUrl }) => {
        const t0 = ctx.now();
        try {
          const normalized: ShapeSpec[] = shapes.map((s, i) => normalizeShape(s, i));
          const slug = slugify(title) || "shapes";
          const doc: ShapeMapDoc = {
            title,
            shapes: normalized,
            config: {
              ...(center ? { center } : {}),
              ...(zoom !== undefined ? { zoom } : {}),
              ...(tileUrl ? { tileUrl } : {}),
            },
          };
          const result = await renderAndRun(ctx, slug, doc);
          ctx.trace("tool shapefile_draw", t0, `${slug} · ${normalized.length} shapes · ${result.chars} chars`);
          return summarize(result);
        } catch (error) {
          ctx.trace("tool shapefile_draw", t0, "error");
          return `shapefile error: ${errorText(error)}`;
        }
      },
    }),

    shapefile_add: tool({
      description:
        "Append shapes to an existing shape map (maps/<slug>) and re-render it in the Viewer. Reads the maps/<slug>.shapes.json sidecar, so shapes added earlier are preserved.",
      inputSchema: z.object({
        map: z
          .string()
          .min(1)
          .describe("Shape map slug, or its maps/<slug>.shapes.json / maps/<slug>.html path"),
        shapes: shapesInput,
      }),
      execute: async ({ map, shapes }) => {
        const t0 = ctx.now();
        try {
          if (!ctx.workspace) throw new ShapefileError("host did not provide workspace access");
          const jsonPath = sidecarPath(map);
          if (!(await ctx.workspace.exists(jsonPath))) {
            return `shapefile error: no shape map at ${jsonPath} — call shapefile_draw first`;
          }
          const doc = normalizeDoc(JSON.parse(await ctx.workspace.readFile(jsonPath)));
          const added: ShapeSpec[] = shapes.map((s, i) => normalizeShape(s, i));
          doc.shapes.push(...added);
          const slug = jsonPath.replace(/^maps\//, "").replace(/\.shapes\.json$/, "");
          const result = await renderAndRun(ctx, slug, doc);
          ctx.trace("tool shapefile_add", t0, `${slug} · +${added.length} (${doc.shapes.length} total)`);
          return summarize(result);
        } catch (error) {
          ctx.trace("tool shapefile_add", t0, "error");
          return `shapefile error: ${errorText(error)}`;
        }
      },
    }),

    shapefile_clear: tool({
      description:
        "Remove all shapes from an existing shape map and re-render the empty base map in the Viewer.",
      inputSchema: z.object({
        map: z
          .string()
          .min(1)
          .describe("Shape map slug, or its maps/<slug>.shapes.json / maps/<slug>.html path"),
      }),
      execute: async ({ map }) => {
        const t0 = ctx.now();
        try {
          if (!ctx.workspace) throw new ShapefileError("host did not provide workspace access");
          const jsonPath = sidecarPath(map);
          if (!(await ctx.workspace.exists(jsonPath))) {
            return `shapefile error: no shape map at ${jsonPath} — call shapefile_draw first`;
          }
          const doc = normalizeDoc(JSON.parse(await ctx.workspace.readFile(jsonPath)));
          doc.shapes = [];
          const slug = jsonPath.replace(/^maps\//, "").replace(/\.shapes\.json$/, "");
          const result = await renderAndRun(ctx, slug, doc);
          ctx.trace("tool shapefile_clear", t0, slug);
          return summarize(result);
        } catch (error) {
          ctx.trace("tool shapefile_clear", t0, "error");
          return `shapefile error: ${errorText(error)}`;
        }
      },
    }),

    shapefile_list: tool({
      description:
        "List the shape maps currently in the workspace (maps/*.shapes.json) with their shape counts. Read-only.",
      inputSchema: z.object({}),
      execute: async () => {
        const t0 = ctx.now();
        try {
          if (!ctx.workspace) throw new ShapefileError("host did not provide workspace access");
          const files = await ctx.workspace.listFiles();
          const sidecars = files.filter(
            (f) => f.startsWith("maps/") && f.endsWith(".shapes.json"),
          );
          const rows: string[] = [];
          for (const path of sidecars) {
            try {
              const doc = normalizeDoc(JSON.parse(await ctx.workspace.readFile(path)));
              rows.push(`${path} — ${doc.title} · ${doc.shapes.length} shapes`);
            } catch {
              rows.push(`${path} — unreadable sidecar`);
            }
          }
          ctx.trace("tool shapefile_list", t0, `${sidecars.length} maps`);
          return rows.length ? rows.join("\n") : "no shape maps yet — call shapefile_draw first";
        } catch (error) {
          ctx.trace("tool shapefile_list", t0, "error");
          return `shapefile error: ${errorText(error)}`;
        }
      },
    }),
  };
}
