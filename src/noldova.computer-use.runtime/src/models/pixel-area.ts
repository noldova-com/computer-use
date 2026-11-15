/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class PixelArea {
  public readonly bottom: number;
  public readonly left: number;
  public readonly right: number;
  public readonly top: number;

  public constructor(left: number, top: number, right: number, bottom: number) {
    this.bottom = bottom;
    this.left = left;
    this.right = right;
    this.top = top;
  }
}
