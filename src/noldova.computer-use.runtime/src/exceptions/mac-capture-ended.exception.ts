/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ProcessExit } from "@noldova/desktop.runtime";

import { Resources } from "../resources.ts";
import { MacDesktopException } from "./mac-desktop.exception.ts";

export class MacCaptureEndedException extends MacDesktopException {
  public readonly exit: ProcessExit;

  public constructor(exit: ProcessExit) {
    super(Resources.formatMacCaptureEnded(exit));

    this.exit = exit;
  }
}
