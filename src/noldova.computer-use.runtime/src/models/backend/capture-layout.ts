/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { DesktopRect } from "./desktop-rect.ts";

export class CaptureLayout {
  public readonly displayId: string;
  public readonly frame: DesktopRect;
  public readonly height: number;
  public readonly scaleFactor: number;
  public readonly width: number;

  public constructor(displayId: string, frame: DesktopRect, scaleFactor: number, width: number, height: number) {
    if (displayId === "")
      throw new ArgumentOutOfRangeException(Resources.displayIdParameterName, displayId, Resources.emptyDisplayId);
    if (!Number.isFinite(scaleFactor) || scaleFactor <= 0)
      throw new ArgumentOutOfRangeException(Resources.scaleFactorParameterName, scaleFactor, Resources.formatInvalidScaleFactor(displayId));
    if (!Number.isSafeInteger(width) || width <= 0)
      throw new ArgumentOutOfRangeException(Resources.widthParameterName, width, Resources.formatInvalidCaptureSize(displayId, width, height));
    if (!Number.isSafeInteger(height) || height <= 0)
      throw new ArgumentOutOfRangeException(Resources.heightParameterName, height, Resources.formatInvalidCaptureSize(displayId, width, height));

    this.displayId = displayId;
    this.frame = frame;
    this.height = height;
    this.scaleFactor = scaleFactor;
    this.width = width;
  }
}
