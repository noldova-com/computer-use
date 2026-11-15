/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { MacScriptEndedException } from "./mac-script-ended.exception.ts";

export class MacScriptLineUnreadableException extends MacScriptEndedException {
  public readonly length: number;

  public constructor(length: number) {
    super(Resources.formatMacScriptBadAnswer(length));

    this.length = length;
  }
}
