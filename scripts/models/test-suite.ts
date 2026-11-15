/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class TestSuite {
  public readonly name: string;
  public readonly hangLimitMs: number;
  public readonly hangReason: string;

  public constructor(name: string, hangLimitMs: number, hangReason: string) {
    this.name = name;
    this.hangLimitMs = hangLimitMs;
    this.hangReason = hangReason;
  }
}
