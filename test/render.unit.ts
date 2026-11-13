// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// Unit tests for the Leaflet HTML renderer. No network, no DOM.

import { test } from "node:test";

import assert from "node:assert/strict";

import {
  LEAFLET_CDN,
  OSM_TILE_URL,
  jsonForScript,
  renderMapHtml,
} from "../src/render.ts";

import { normalizeShape } from "../src/shapes.ts";

import type { ShapeMapDoc } from "../src/types.ts";

const doc: ShapeMapDoc = {
  title: 'Test "map" <script>',
  shapes: [
    normalizeShape({ type: "marker", position: [48.8566, 2.3522], popup: "Paris" }),
    normalizeShape({
      type: "circle",
      center: [48.8566, 2.3522],
      radiusMeters: 5000,
      style: { color: "#2563eb" },
    }),
    normalizeShape({
      type: "geojson",
      geojson: { type: "Point", coordinates: [2.3522, 48.8566] },
      popup: "</script><script>alert(1)</script>",
    }),
  ],
  config: {},
};

test("renderMapHtml pins Leaflet from the CDN and OSM tiles", () => {
  const html = renderMapHtml(doc);
  assert.ok(html.includes(`href="${LEAFLET_CDN}/leaflet.css"`));
  assert.ok(html.includes(`src="${LEAFLET_CDN}/leaflet.js"`));
  assert.ok(html.includes(OSM_TILE_URL));
  assert.ok(html.includes("OpenStreetMap"));
});

test("renderMapHtml escapes the title in HTML", () => {
  const html = renderMapHtml(doc);
  assert.ok(html.includes("<title>Test &quot;map&quot; &lt;script&gt;</title>"));
});

test("renderMapHtml inlines shapes JSON without a raw closing script tag", () => {
  const html = renderMapHtml(doc);
  // The popup payload must be unicode-escaped inside the inlined JSON.
  assert.ok(!html.includes("</script><script>alert(1)</script>"));
  const BS = String.fromCharCode(92);
  assert.ok(html.includes(BS + "u003c/script" + BS + "u003e"));
  // Exactly two script elements: the CDN one and the inline one.
  assert.equal(html.match(/<script[ >]/g)?.length, 2);
  assert.equal(html.match(/<\/script>/g)?.length, 2);
});

test("renderMapHtml maps every shape type to a Leaflet layer call", () => {
  const html = renderMapHtml(doc);
  for (const call of ["L.marker", "L.circle", "L.rectangle", "L.polyline", "L.polygon", "L.geoJSON", "fitBounds"]) {
    assert.ok(html.includes(call), `missing ${call}`);
  }
});

test("renderMapHtml merges config overrides over the OSM defaults", () => {
  const html = renderMapHtml({
    title: "t",
    shapes: [],
    config: { tileUrl: "https://tiles.example.org/{z}/{x}/{y}.png", zoom: 5, center: [10, 20] },
  });
  assert.ok(html.includes("https://tiles.example.org/{z}/{x}/{y}.png"));
  assert.ok(!html.includes(OSM_TILE_URL));
  assert.ok(html.includes("setView"));
  assert.ok(html.includes("openstreetmap.org/copyright"), "attribution default is kept");
});

test("jsonForScript escapes angle brackets and line separators", () => {
  const out = jsonForScript({ a: "</script>" });
  assert.ok(!out.includes("</script>"));
  assert.ok(out.includes(String.fromCharCode(92) + "u003c"));
});
