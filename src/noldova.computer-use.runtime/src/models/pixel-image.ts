/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class PixelImage {
  public static readonly bytesPerPixel: number = Resources.bytesPerPixel;
  public readonly bgra: Uint8Array;
  public readonly height: number;
  public readonly width: number;

  public constructor(width: number, height: number, bgra: Uint8Array) {
    this.bgra = bgra;
    this.height = height;
    this.width = width;
  }
}
