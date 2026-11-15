/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class TestRecordsMissingException extends TestRunException {
  public readonly recordsFile: string;

  public constructor(recordsFile: string) {
    super(Resources.formatTestRecordsMissing(recordsFile));

    this.recordsFile = recordsFile;
  }
}
