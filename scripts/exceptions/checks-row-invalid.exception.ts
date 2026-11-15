/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class ChecksRowInvalidException extends TestRunException {
  public readonly table: string;
  public readonly row: string;

  public constructor(table: string, row: string) {
    super(Resources.formatChecksRowInvalid(table, row));

    this.table = table;
    this.row = row;
  }
}
