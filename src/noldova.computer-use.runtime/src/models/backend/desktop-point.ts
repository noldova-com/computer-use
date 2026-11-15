/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";

export class DesktopPoint {
  public readonly x: number;
  public readonly y: number;

  public constructor(x: number, y: number) {
    if (!Number.isSafeInteger(x))
      throw new ArgumentOutOfRangeException(Resources.xParameterName, x, Resources.formatInvalidDesktopPoint(x, y));
    if (!Number.isSafeInteger(y))
      throw new ArgumentOutOfRangeException(Resources.yParameterName, y, Resources.formatInvalidDesktopPoint(x, y));

    this.x = x;
    this.y = y;
  }
}
