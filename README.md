# @tablette/module-shapefile

Draw shapes on the OpenStreetMap Leaflet viewer from the Studio agent.

A tablette v4 module: it implements the `@tablette/module-sdk` contract and
contributes agent tools, a prompt section, attribution and a Surface to the
tablette core. The tools render a single-file Leaflet app into the workspace
(`maps/<slug>.html`, shapes in `maps/<slug>.shapes.json`) and ask the host to
show it in the Viewer iframe via `ctx.runApp()`.

## Tools

| Tool | Effect |
|:--|:--|
| `shapefile_draw` | Create/replace a shape map and render it in the Viewer |
| `shapefile_add` | Append shapes to an existing shape map and re-render |
| `shapefile_clear` | Remove all shapes from an existing shape map |
| `shapefile_list` | List shape maps in the workspace (read-only) |

Shape types: `marker`, `circle` (radius in meters), `rectangle`, `polyline`,
`polygon`, `geojson` (any GeoJSON object, e.g. converted from a `.shp`).
Coordinates are `[lat, lng]`; each shape takes an optional `popup` and `style`.

## Install

Installed by the tablette core as a dependency; it is not a standalone app.

```bash
npm install @tablette/module-shapefile
```

The core picks the module up from its `studioModule` metadata in
`package.json` (`scripts/gen-registry.mjs` in the core repo); opting in is a
`package.json` edit, not a source edit.

## Build and test

```bash
npm run build     # tsc -> dist/
npm test          # node --test test/*.unit.ts
```

## Documentation

https://tablette.bimr.net/modules/shapefile

See the `@tablette/module-sdk` package for the contract. A module package
must not import core source (`src/agent/*`, `src/forge/*`, `src/app/*`,
`src/map/*`); host capabilities arrive through `ModuleContext`.
