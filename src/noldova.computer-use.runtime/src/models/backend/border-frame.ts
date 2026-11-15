/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { Display } from "../display.ts";
import { DesktopRect } from "./desktop-rect.ts";

export class BorderFrame {
  public readonly bounds: DesktopRect;
  public readonly thickness: number;

  public constructor(bounds: DesktopRect, thickness: number) {
    if (!Number.isSafeInteger(thickness) || thickness <= 0 || 2 * thickness > Math.min(bounds.width, bounds.height))
      throw new ArgumentOutOfRangeException(Resources.thicknessParameterName, thickness, Resources.formatInvalidBorderThickness(thickness));

    this.bounds = bounds;
    this.thickness = thickness;
  }

  public static of(display: Display, unitsPerPixel: number): BorderFrame {
    const thickness = Math.max(1, Math.round(Resources.borderWidthRem * Resources.pixelsPerRem * unitsPerPixel));
    return new BorderFrame(new DesktopRect(display.x, display.y, display.width, display.height), thickness);
  }
}
