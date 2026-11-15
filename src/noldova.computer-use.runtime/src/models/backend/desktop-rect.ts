/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";

export class DesktopRect {
  public readonly height: number;
  public readonly width: number;
  public readonly x: number;
  public readonly y: number;

  public constructor(x: number, y: number, width: number, height: number) {
    if (!Number.isSafeInteger(x))
      throw new ArgumentOutOfRangeException(Resources.xParameterName, x, Resources.formatInvalidDesktopRect(x, y, width, height));
    if (!Number.isSafeInteger(y))
      throw new ArgumentOutOfRangeException(Resources.yParameterName, y, Resources.formatInvalidDesktopRect(x, y, width, height));
    if (!Number.isSafeInteger(width) || width <= 0)
      throw new ArgumentOutOfRangeException(Resources.widthParameterName, width, Resources.formatInvalidDesktopRect(x, y, width, height));
    if (!Number.isSafeInteger(height) || height <= 0)
      throw new ArgumentOutOfRangeException(Resources.heightParameterName, height, Resources.formatInvalidDesktopRect(x, y, width, height));

    this.height = height;
    this.width = width;
    this.x = x;
    this.y = y;
  }
}
