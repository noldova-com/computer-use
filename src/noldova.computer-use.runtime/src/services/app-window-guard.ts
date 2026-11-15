/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IAppWindows, ToolFailureCode } from "@noldova/desktop.runtime";

import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import type { WindowStack } from "../models/backend/window-stack.ts";
import { Resources } from "../resources.ts";
import { CallFailures } from "./call-failures.ts";

export class AppWindowGuard implements IWindowBackend {
  private readonly appWindows: IAppWindows;
  private readonly windows: IWindowBackend;

  public constructor(windows: IWindowBackend, appWindows: IAppWindows) {
    this.appWindows = appWindows;
    this.windows = windows;
  }

  public async getForegroundWindowAsync(signal: AbortSignal): Promise<WindowInfo | null> {
    const window = await this.windows.getForegroundWindowAsync(signal);
    if (window !== null && this.appWindows.list().some(t => t.processId === window.target.processId))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.appWindowInFront);

    return window;
  }

  public async listStackAsync(signal: AbortSignal): Promise<WindowStack> {
    return await this.windows.listStackAsync(signal);
  }
}
