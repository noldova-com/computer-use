/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class EncodedImage {
  public readonly height: number;
  public readonly png: Uint8Array;
  public readonly width: number;

  public constructor(width: number, height: number, png: Uint8Array) {
    this.height = height;
    this.png = png;
    this.width = width;
  }
}
