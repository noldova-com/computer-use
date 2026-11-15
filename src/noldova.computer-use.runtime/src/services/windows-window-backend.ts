/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import { AppIdentity } from "../models/backend/app-identity.ts";
import { DesktopRect } from "../models/backend/desktop-rect.ts";
import { StackedWindow } from "../models/backend/stacked-window.ts";
import { WindowInfo } from "../models/backend/window-info.ts";
import { WindowStack } from "../models/backend/window-stack.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";

export class WindowsWindowBackend implements IWindowBackend {
  private readonly api: IWindowsDesktopApi;

  public constructor(api: IWindowsDesktopApi) {
    this.api = api;
  }

  public async getForegroundWindowAsync(signal: AbortSignal): Promise<WindowInfo | null> {
    signal.throwIfAborted();
    const window = this.api.getForegroundWindow();
    if (window === null)
      return null;

    const app = WindowsWindowBackend.appOf(window.imagePath, window.className);
    if (app === null)
      return null;

    return BackendAnswers.read(Resources.windowsForegroundWindowAnswer, window, () => new WindowInfo(app, path.win32.parse(window.imagePath).name, window.windowId, window.processId,
      new DesktopRect(window.x, window.y, window.width, window.height), window.isElevated));
  }

  public async listStackAsync(signal: AbortSignal): Promise<WindowStack> {
    signal.throwIfAborted();
    const list = this.api.listWindows();
    const windows = list.windows.map(t => BackendAnswers.read(Resources.windowsListWindowsAnswer, t,
      () => new StackedWindow(WindowsWindowBackend.appOf(t.imagePath, t.className), t.windowId, new DesktopRect(t.x, t.y, t.width, t.height))));

    return new WindowStack(list.isComplete, windows);
  }

  private static appOf(imagePath: string, className: string): AppIdentity | null {
    if (imagePath === "")
      return null;
    if (path.win32.basename(imagePath).toLowerCase() === Resources.fileExplorerProgram && className !== Resources.folderWindowClass)
      return null;

    return AppIdentity.ofWindowsPath(imagePath);
  }
}
