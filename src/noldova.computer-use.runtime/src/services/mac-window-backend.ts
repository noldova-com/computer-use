/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import { AppIdentity } from "../models/backend/app-identity.ts";
import { DesktopRect } from "../models/backend/desktop-rect.ts";
import { StackedWindow } from "../models/backend/stacked-window.ts";
import { WindowInfo } from "../models/backend/window-info.ts";
import { WindowStack } from "../models/backend/window-stack.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacWindowBackend implements IWindowBackend {
  private readonly api: MacDesktopApi;

  public constructor(api: MacDesktopApi) {
    this.api = api;
  }

  public async getForegroundWindowAsync(signal: AbortSignal): Promise<WindowInfo | null> {
    signal.throwIfAborted();
    const window = await this.api.getForegroundWindowAsync();
    if (window === null)
      return null;

    return BackendAnswers.read(Resources.macScriptMethods.getForegroundWindow, window, () => new WindowInfo(AppIdentity.ofMacBundleId(window.bundleId), window.appName,
      window.windowId, window.processId, new DesktopRect(window.x, window.y, window.width, window.height), false));
  }

  public async listStackAsync(signal: AbortSignal): Promise<WindowStack> {
    signal.throwIfAborted();
    const list = await this.api.listWindowsAsync();
    const windows = list.windows.map(t => BackendAnswers.read(Resources.macScriptMethods.listWindows, t,
      () => new StackedWindow(t.bundleId === "" ? null : AppIdentity.ofMacBundleId(t.bundleId), t.windowId, new DesktopRect(t.x, t.y, t.width, t.height))));

    return new WindowStack(list.isComplete, windows);
  }
}
