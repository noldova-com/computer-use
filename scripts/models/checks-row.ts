/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ChecksRow {
  public readonly file: string;
  public readonly reason: string;
  public readonly line: number;

  public constructor(file: string, reason: string, line: number) {
    this.file = file;
    this.reason = reason;
    this.line = line;
  }
}
