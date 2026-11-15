/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RefusalReason } from "../models/backend/refusal-reason.ts";
import { Resources } from "../resources.ts";
import { ComputerUseException } from "./computer-use.exception.ts";

export class RefusalException extends ComputerUseException {
  public readonly isInputSent: boolean;
  public readonly reason: RefusalReason;

  public constructor(reason: RefusalReason, isInputSent: boolean) {
    super(isInputSent ? Resources.formatRefusedAfterInput(reason.description) : reason.description);

    this.isInputSent = isInputSent;
    this.reason = reason;
  }
}
