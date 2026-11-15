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
import { InputTarget } from "./input-target.ts";

export class WindowInfo {
  public readonly app: AppIdentity;
  public readonly appName: string;
  public readonly frame: DesktopRect;
  public readonly isElevated: boolean;
  public readonly target: InputTarget;

  public constructor(app: AppIdentity, appName: string, windowId: string, processId: number, frame: DesktopRect, isElevated: boolean) {
    if (appName.trim() === "")
      throw new ArgumentOutOfRangeException(Resources.appNameParameterName, appName, Resources.formatEmptyAppName(app.id));
    const target = new InputTarget(app, windowId, processId);

    this.app = app;
    this.appName = appName;
    this.frame = frame;
    this.isElevated = isElevated;
    this.target = target;
  }
}
