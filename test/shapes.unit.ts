// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// Unit tests for shape validation/normalization. No network, no DOM.

import { test } from "node:test";

import assert from "node:assert/strict";

import {
  ShapefileError,
  describeShape,
  normalizeDoc,
  normalizeShape,
  slugify,
} from "../src/shapes.ts";

test("normalizeShape accepts every shape type", () => {
  assert.deepEqual(
    normalizeShape({ type: "marker", position: [48.85, 2.35], popup: "Paris" }),
    { type: "marker", position: [48.85, 2.35], popup: "Paris" },
  );
  const circle = normalizeShape({
    type: "circle",
    center: [48.85, 2.35],
    radiusMeters: 500,
    style: { color: "#2563eb", fillOpacity: 0.2 },
  });
  assert.equal(circle.type, "circle");
  const rect = normalizeShape({
    type: "rectangle",
    bounds: [[48.0, 2.0], [49.0, 3.0]],
  });
  assert.equal(rect.type, "rectangle");
  assert.equal(
    normalizeShape({ type: "polyline", positions: [[0, 0], [1, 1]] }).type,
    "polyline",
  );
  assert.equal(
    normalizeShape({
      type: "polygon",
      positions: [[0, 0], [1, 0], [1, 1]],
    }).type,
    "polygon",
  );
  const gj = normalizeShape({
    type: "geojson",
    geojson: { type: "Point", coordinates: [2.35, 48.85] },
  });
  assert.equal(gj.type, "geojson");
});

test("normalizeShape rejects out-of-range coordinates", () => {
  assert.throws(
    () => normalizeShape({ type: "marker", position: [91, 0] }),
    (error: unknown) => error instanceof ShapefileError && /lat\/lng out of range/.test((error as Error).message),
  );
  assert.throws(
    () => normalizeShape({ type: "marker", position: [0, 181] }),
    ShapefileError,
  );
});

test("normalizeShape rejects unknown types and bad arity", () => {
  assert.throws(() => normalizeShape({ type: "hexagon" }), ShapefileError);
  assert.throws(
    () => normalizeShape({ type: "polyline", positions: [[0, 0]] }),
    ShapefileError,
  );
  assert.throws(() => normalizeShape({ type: "circle", center: [0, 0] }), ShapefileError);
});

test("normalizeShape reports the offending index", () => {
  assert.throws(
    () => normalizeShape({ type: "nope" }, 7),
    /shapes\[7\]/,
  );
});

test("normalizeDoc fills the config default and validates shapes", () => {
  const doc = normalizeDoc({
    title: "Test",
    shapes: [{ type: "marker", position: [0, 0] }],
  });
  assert.deepEqual(doc.config, {});
  assert.throws(() => normalizeDoc({ title: "", shapes: [] }), ShapefileError);
  assert.throws(
    () => normalizeDoc({ title: "x", shapes: [{ type: "marker", position: [999, 0] }] }),
    ShapefileError,
  );
});

test("slugify matches the core catalogue rule", () => {
  assert.equal(slugify("École des Beaux-Arts !"), "ecole-des-beaux-arts");
  assert.equal(slugify("  --Hello, World--  "), "hello-world");
  assert.equal(slugify("!!!"), "");
});

test("describeShape summarizes each type", () => {
  assert.equal(describeShape(normalizeShape({ type: "marker", position: [1, 2] })), "marker 1,2");
  assert.match(
    describeShape(normalizeShape({ type: "circle", center: [1, 2], radiusMeters: 10 })),
    /^circle 1,2 r=10m$/,
  );
  assert.match(
    describeShape(normalizeShape({ type: "geojson", geojson: { type: "Feature" } })),
    /geojson Feature/,
  );
});
