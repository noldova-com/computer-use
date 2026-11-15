/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ImageRect {
  public readonly height: number;
  public readonly width: number;
  public readonly x: number;
  public readonly y: number;

  public constructor(x: number, y: number, width: number, height: number) {
    this.height = height;
    this.width = width;
    this.x = x;
    this.y = y;
  }
}
