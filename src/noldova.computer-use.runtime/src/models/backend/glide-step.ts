/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { DesktopPoint } from "./desktop-point.ts";

export class GlideStep {
  public readonly atMs: number;
  public readonly point: DesktopPoint;

  public constructor(point: DesktopPoint, atMs: number) {
    this.atMs = atMs;
    this.point = point;
  }
}
