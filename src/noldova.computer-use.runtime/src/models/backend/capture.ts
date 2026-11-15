/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import { DesktopPoint } from "./desktop-point.ts";
import type { DesktopRect } from "./desktop-rect.ts";

export class Capture {
  public static readonly bytesPerPixel: number = Resources.bytesPerPixel;
  public readonly bgra: Uint8Array;
  public readonly displayId: string;
  public readonly frame: DesktopRect;
  public readonly height: number;
  public readonly scaleFactor: number;
  public readonly width: number;

  public constructor(displayId: string, frame: DesktopRect, scaleFactor: number, width: number, height: number, bgra: Uint8Array) {
    if (displayId === "")
      throw new ArgumentOutOfRangeException(Resources.displayIdParameterName, displayId, Resources.emptyDisplayId);
    if (!Number.isFinite(scaleFactor) || scaleFactor <= 0)
      throw new ArgumentOutOfRangeException(Resources.scaleFactorParameterName, scaleFactor, Resources.formatInvalidScaleFactor(displayId));
    if (!Number.isSafeInteger(width) || width <= 0)
      throw new ArgumentOutOfRangeException(Resources.widthParameterName, width, Resources.formatInvalidCaptureSize(displayId, width, height));
    if (!Number.isSafeInteger(height) || height <= 0)
      throw new ArgumentOutOfRangeException(Resources.heightParameterName, height, Resources.formatInvalidCaptureSize(displayId, width, height));
    if (bgra.byteLength !== width * height * Capture.bytesPerPixel)
      throw new ArgumentException(Resources.formatInvalidCapturePixels(displayId, bgra.byteLength, width, height), Resources.bgraParameterName);

    this.bgra = bgra;
    this.displayId = displayId;
    this.frame = frame;
    this.height = height;
    this.scaleFactor = scaleFactor;
    this.width = width;
  }

  public toDesktopPoint(imageX: number, imageY: number): DesktopPoint {
    if (!Number.isSafeInteger(imageX) || imageX < 0 || imageX >= this.width)
      throw new ArgumentOutOfRangeException(Resources.imageXParameterName, imageX, Resources.formatOutsideCapture(imageX, imageY, this.width, this.height));
    if (!Number.isSafeInteger(imageY) || imageY < 0 || imageY >= this.height)
      throw new ArgumentOutOfRangeException(Resources.imageYParameterName, imageY, Resources.formatOutsideCapture(imageX, imageY, this.width, this.height));

    return new DesktopPoint(
      this.frame.x + Math.floor((imageX + 0.5) * this.frame.width / this.width),
      this.frame.y + Math.floor((imageY + 0.5) * this.frame.height / this.height));
  }
}
