/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import type { DesktopPoint } from "./backend/desktop-point.ts";
import type { ImagePoint } from "./image-point.ts";
import { PermissionDetail } from "./permission-detail.ts";
import type { ReadControl } from "./read-control.ts";

export class AimedPoint {
  public readonly at: DesktopPoint;
  public readonly control: ReadControl | null;
  public readonly pixel: ImagePoint;

  public constructor(pixel: ImagePoint, at: DesktopPoint, control: ReadControl | null) {
    this.at = at;
    this.control = control;
    this.pixel = pixel;
  }

  public details(pointName: string, controlName: string): readonly PermissionDetail[] {
    const point = new PermissionDetail(pointName, Resources.formatPoint(this.pixel.x, this.pixel.y));

    return this.control === null ? [point] : [point, new PermissionDetail(controlName, Resources.formatControl(this.control.role.value, this.control.name))];
  }
}
