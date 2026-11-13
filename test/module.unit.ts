// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// Descriptor contract tests + an end-to-end draw through a stub host context.

import { test } from "node:test";

import assert from "node:assert/strict";

import { validateModules } from "@tablette/module-sdk";

import type { ModuleContext } from "@tablette/module-sdk";

import { shapefileModule } from "../src/module.ts";

import { createShapefileTools } from "../src/tools.ts";

test("descriptor passes the SDK contract", () => {
  assert.deepEqual(validateModules([shapefileModule]), []);
});

test("all tools carry the shapefile_ prefix", () => {
  const ctx = stubContext();
  const names = Object.keys(createShapefileTools(ctx));
  assert.deepEqual(names.sort(), [
    "shapefile_add",
    "shapefile_clear",
    "shapefile_draw",
    "shapefile_list",
  ]);
});

interface Stub extends ModuleContext {
  files: Map<string, string>;
  ran: boolean;
}

function stubContext(): Stub {
  const files = new Map<string, string>();
  const ctx = {
    files,
    ran: false,
    settings: {},
    enabled: new Set(["shapefile"]),
    credits: [] as string[],
    trace: () => {},
    now: () => 0,
    fetch: (() => Promise.reject(new Error("no fetch in tests"))) as typeof fetch,
    markRun: () => {},
    workspace: {
      listFiles: async () => [...files.keys()],
      readFile: async (path: string) => {
        const value = files.get(path);
        if (value === undefined) throw new Error(`no such file: ${path}`);
        return value;
      },
      writeFile: async (path: string, content: string) => void files.set(path, content),
      exists: async (path: string) => files.has(path),
      openFile: async () => {},
      subscribeFiles: () => () => {},
    },
    runApp: () => {
      ctx.ran = true;
      return true;
    },
    setMode: () => {},
  } as Stub;
  return ctx;
}

type ToolWithExecute = { execute: (input: never) => Promise<string> };

function toolsOf(ctx: Stub): Record<string, ToolWithExecute> {
  return createShapefileTools(ctx) as unknown as Record<string, ToolWithExecute>;
}

test("shapefile_draw writes the app + sidecar and runs the viewer", async () => {
  const ctx = stubContext();
  const out = await toolsOf(ctx).shapefile_draw.execute({
    title: "Tour de France 2026",
    shapes: [
      { type: "marker", position: [48.8566, 2.3522], popup: "Paris" },
      { type: "polygon", positions: [[48.8, 2.2], [48.9, 2.2], [48.9, 2.4]] },
    ],
  } as never);
  assert.match(out, /rendered in the Viewer/);
  assert.ok(ctx.ran, "runApp was called");
  const html = ctx.files.get("maps/tour-de-france-2026.html");
  const json = ctx.files.get("maps/tour-de-france-2026.shapes.json");
  assert.ok(html && html.includes("L.marker") && html.includes("L.polygon"));
  assert.ok(json && JSON.parse(json).shapes.length === 2);
});

test("shapefile_draw rejects a bad shape without writing", async () => {
  const ctx = stubContext();
  const out = await toolsOf(ctx).shapefile_draw.execute({
    title: "bad",
    shapes: [{ type: "marker", position: [200, 0] }],
  } as never);
  assert.match(out, /shapefile error/);
  assert.equal(ctx.files.size, 0);
  assert.equal(ctx.ran, false);
});

test("shapefile_add appends to the sidecar and shapefile_clear empties it", async () => {
  const ctx = stubContext();
  const tools = toolsOf(ctx);
  await tools.shapefile_draw.execute({
    title: "demo",
    shapes: [{ type: "marker", position: [0, 0] }],
  } as never);
  const added = await tools.shapefile_add.execute({
    map: "demo",
    shapes: [{ type: "circle", center: [1, 1], radiusMeters: 100 }],
  } as never);
  assert.match(added, /shapes: 2/);
  let doc = JSON.parse(ctx.files.get("maps/demo.shapes.json")!);
  assert.equal(doc.shapes.length, 2);
  await tools.shapefile_clear.execute({ map: "maps/demo.html" } as never);
  doc = JSON.parse(ctx.files.get("maps/demo.shapes.json")!);
  assert.equal(doc.shapes.length, 0);
  const list = await tools.shapefile_list.execute({} as never);
  assert.match(list, /maps\/demo\.shapes\.json — demo · 0 shapes/);
});

test("shapefile_add errors on an unknown map", async () => {
  const ctx = stubContext();
  const out = await toolsOf(ctx).shapefile_add.execute({
    map: "nope",
    shapes: [{ type: "marker", position: [0, 0] }],
  } as never);
  assert.match(out, /no shape map at maps\/nope\.shapes\.json/);
});
