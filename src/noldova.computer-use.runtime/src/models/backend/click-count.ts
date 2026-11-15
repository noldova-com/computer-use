/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ClickCount {
  public static readonly Single: ClickCount = new ClickCount("Single", 1);
  public static readonly Double: ClickCount = new ClickCount("Double", 2);
  public static readonly Triple: ClickCount = new ClickCount("Triple", 3);
  public readonly count: number;
  public readonly value: string;

  private constructor(value: string, count: number) {
    this.count = count;
    this.value = value;
  }
}
