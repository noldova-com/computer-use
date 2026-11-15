/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ProcessExit } from "@noldova/desktop.runtime";

import { Resources } from "../resources.ts";
import { MacScriptEndedException } from "./mac-script-ended.exception.ts";

export class MacScriptExitedException extends MacScriptEndedException {
  public readonly exit: ProcessExit;
  public readonly lastError: string;

  public constructor(exit: ProcessExit, lastError: string) {
    super(Resources.formatMacScriptEnded(exit, lastError));

    this.exit = exit;
    this.lastError = lastError;
  }
}
