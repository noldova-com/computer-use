/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";

export class ScrollAmount {
  public static readonly maxNotches: number = Resources.maxScrollNotches;
  public readonly x: number;
  public readonly y: number;

  public constructor(x: number, y: number) {
    if (!ScrollAmount.isNotches(x))
      throw new ArgumentOutOfRangeException(Resources.xParameterName, x, Resources.formatInvalidScrollAmount(x, y, ScrollAmount.maxNotches));
    if (!ScrollAmount.isNotches(y))
      throw new ArgumentOutOfRangeException(Resources.yParameterName, y, Resources.formatInvalidScrollAmount(x, y, ScrollAmount.maxNotches));
    if (x === 0 && y === 0)
      throw new ArgumentException(Resources.formatInvalidScrollAmount(x, y, ScrollAmount.maxNotches));

    this.x = x;
    this.y = y;
  }

  private static isNotches(value: number): boolean {
    return Number.isSafeInteger(value) && Math.abs(value) <= ScrollAmount.maxNotches;
  }
}
