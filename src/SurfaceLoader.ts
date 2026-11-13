// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// packages/module-shapefile/src/SurfaceLoader.ts — lazy loader for the Shapefile UI.

import { lazy } from "react";

import type { ComponentType } from "react";

import type { ModuleSurfaceProps } from "@tablette/module-sdk";

export const ShapefileSurface = lazy(
  () => import("./Surface.tsx"),
) as unknown as ComponentType<ModuleSurfaceProps>;
