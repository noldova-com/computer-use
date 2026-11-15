/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { MacScriptEndedException } from "./mac-script-ended.exception.ts";

export class MacScriptStartFailedException extends MacScriptEndedException {
  public constructor(cause: unknown) {
    super(Resources.formatMacScriptStartFailed(String(cause)), new ExceptionOptions(cause));
  }
}
