/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { MacScriptEndedException } from "./mac-script-ended.exception.ts";

export class MacScriptTimedOutException extends MacScriptEndedException {
  public readonly method: string;
  public readonly timeoutMs: number;

  public constructor(method: string, timeoutMs: number) {
    super(Resources.formatMacScriptTimedOut(method, timeoutMs));

    this.method = method;
    this.timeoutMs = timeoutMs;
  }
}
