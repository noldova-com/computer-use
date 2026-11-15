/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ImageSize {
  public readonly height: number;
  public readonly width: number;

  public constructor(width: number, height: number) {
    this.height = height;
    this.width = width;
  }
}
