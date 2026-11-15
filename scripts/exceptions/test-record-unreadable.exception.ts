/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class TestRecordUnreadableException extends TestRunException {
  public readonly recordsFile: string;
  public readonly line: string;

  public constructor(recordsFile: string, line: string, cause?: unknown) {
    super(Resources.formatTestRecordUnreadable(recordsFile, line), cause === undefined ? undefined : { cause });

    this.recordsFile = recordsFile;
    this.line = line;
  }
}
