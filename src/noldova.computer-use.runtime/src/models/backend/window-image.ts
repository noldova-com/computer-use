/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";

export class WindowImage {
  public static readonly bytesPerPixel: number = Resources.bytesPerPixel;
  public readonly bgra: Uint8Array;
  public readonly height: number;
  public readonly width: number;

  public constructor(width: number, height: number, bgra: Uint8Array) {
    if (!Number.isSafeInteger(width) || width <= 0)
      throw new ArgumentOutOfRangeException(Resources.widthParameterName, width, Resources.formatInvalidWindowImageSize(width, height));
    if (!Number.isSafeInteger(height) || height <= 0)
      throw new ArgumentOutOfRangeException(Resources.heightParameterName, height, Resources.formatInvalidWindowImageSize(width, height));
    if (bgra.byteLength !== width * height * WindowImage.bytesPerPixel)
      throw new ArgumentException(Resources.formatInvalidWindowImagePixels(bgra.byteLength, width, height), Resources.bgraParameterName);

    this.bgra = bgra;
    this.height = height;
    this.width = width;
  }
}
