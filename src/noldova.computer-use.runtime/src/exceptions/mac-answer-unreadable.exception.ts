/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class MacAnswerUnreadableException extends BackendValueException {
  public readonly method: string;

  public constructor(method: string) {
    super(Resources.formatMacAnswerUnreadable(method));

    this.method = method;
  }
}
