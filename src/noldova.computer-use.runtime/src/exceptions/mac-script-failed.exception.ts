/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { MacDesktopException } from "./mac-desktop.exception.ts";

export class MacScriptFailedException extends MacDesktopException {
  public readonly method: string;
  public readonly scriptMessage: string;

  public constructor(method: string, scriptMessage: string) {
    super(Resources.formatMacScriptFailed(method, scriptMessage));

    this.method = method;
    this.scriptMessage = scriptMessage;
  }
}
