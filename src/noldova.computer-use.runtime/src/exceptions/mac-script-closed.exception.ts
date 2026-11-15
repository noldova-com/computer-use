/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { MacScriptEndedException } from "./mac-script-ended.exception.ts";

export class MacScriptClosedException extends MacScriptEndedException {
  public constructor() {
    super(Resources.macScriptClosed);
  }
}
