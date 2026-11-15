/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { AppIdentity } from "./app-identity.ts";
import type { DesktopRect } from "./desktop-rect.ts";

export class StackedWindow {
  public readonly app: AppIdentity | null;
  public readonly frame: DesktopRect;
  public readonly windowId: string;

  public constructor(app: AppIdentity | null, windowId: string, frame: DesktopRect) {
    if (!Resources.windowIdPattern.test(windowId))
      throw new ArgumentOutOfRangeException(Resources.windowIdParameterName, windowId, Resources.formatInvalidWindowId(windowId));

    this.app = app;
    this.frame = frame;
    this.windowId = windowId;
  }
}
