/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class MacCaptureFileTooLargeException extends BackendValueException {
  public readonly size: number;

  public constructor(size: number) {
    super(Resources.formatMacCaptureFileTooLarge(size));

    this.size = size;
  }
}
