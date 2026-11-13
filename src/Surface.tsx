// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/Surface.tsx — the Shapefile draw surface.
//
// A minimal panel: paste a shape list (JSON array) or GeoJSON, give the map a
// title, and draw it. Drawing reuses the same render + workspace path as the
// agent tools, through props.host; without a host (isolated preview) it only
// validates and reports.

import { useState } from "react";

import type { ModuleSurfaceProps } from "@tablette/module-sdk";

import { renderMapHtml } from "./render.ts";

import { ShapefileError, normalizeShape, slugify } from "./shapes.ts";

import type { ShapeMapDoc, ShapeSpec } from "./types.ts";

const EXAMPLE = `[
  { "type": "marker", "position": [48.8566, 2.3522], "popup": "Paris" },
  { "type": "circle", "center": [48.8566, 2.3522], "radiusMeters": 5000,
    "style": { "color": "#2563eb", "fillColor": "#2563eb", "fillOpacity": 0.15 } }
]`;

export default function ShapefileSurface({ host, onUse }: ModuleSurfaceProps) {
  const [title, setTitle] = useState("Shapes");
  const [json, setJson] = useState(EXAMPLE);
  const [message, setMessage] = useState("");

  async function draw(): Promise<void> {
    try {
      const parsed = JSON.parse(json) as unknown;
      const rawShapes = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { shapes?: unknown[] })?.shapes)
          ? (parsed as { shapes: unknown[] }).shapes
          : null;
      if (!rawShapes) throw new ShapefileError("expected a JSON array of shapes, or { shapes: [...] }");
      const shapes: ShapeSpec[] = rawShapes.map((s, i) => normalizeShape(s, i));
      const doc: ShapeMapDoc = { title: title.trim() || "Shapes", shapes, config: {} };
      const slug = slugify(doc.title) || "shapes";
      if (!host) {
        setMessage(`valid: ${shapes.length} shapes, ${renderMapHtml(doc).length} chars (no host attached)`);
        return;
      }
      const htmlPath = `maps/${slug}.html`;
      await host.workspace.writeFile(`maps/${slug}.shapes.json`, `${JSON.stringify(doc, null, 2)}\n`);
      await host.workspace.writeFile(htmlPath, renderMapHtml(doc));
      await host.workspace.openFile(htmlPath);
      const ok = host.runApp();
      setMessage(ok ? `drawn: ${htmlPath}` : `written: ${htmlPath} (viewer did not render)`);
      onUse?.(`Drawn ${shapes.length} shape(s) on "${doc.title}" (${htmlPath})`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="shapefile-surface">
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Shapes (JSON)
        <textarea
          rows={10}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
        />
      </label>
      <button type="button" onClick={() => void draw()}>
        Draw on map
      </button>
      {message ? <p className="shapefile-message">{message}</p> : null}
    </div>
  );
}
