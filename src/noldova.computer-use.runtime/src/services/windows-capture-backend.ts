/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { ICaptureBackend } from "../interfaces/backend/i-capture-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import { CaptureLayout } from "../models/backend/capture-layout.ts";
import { DesktopRect } from "../models/backend/desktop-rect.ts";
import { RefusalReason } from "../models/backend/refusal-reason.ts";
import type { StackedWindow } from "../models/backend/stacked-window.ts";
import { WindowImage } from "../models/backend/window-image.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";

export class WindowsCaptureBackend implements ICaptureBackend {
  private readonly api: IWindowsDesktopApi;

  public constructor(api: IWindowsDesktopApi) {
    this.api = api;
  }

  public async measureDisplayAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout> {
    signal.throwIfAborted();
    const display = this.api.listDisplays().find(t => t.id === displayId);
    if (display === undefined)
      throw new RefusalException(RefusalReason.OutsideDisplays, false);

    return BackendAnswers.read(Resources.windowsListDisplaysAnswer, display,
      () => new CaptureLayout(display.id, new DesktopRect(display.x, display.y, display.width, display.height), display.dpi / Resources.windowsBaseDpi, display.width, display.height));
  }

  public async captureWindowAsync(window: StackedWindow, signal: AbortSignal): Promise<WindowImage | null> {
    signal.throwIfAborted();
    const image = await this.api.captureWindow(window.windowId, window.frame.x, window.frame.y, window.frame.width, window.frame.height, Resources.windowsCaptureTimeoutMs);

    return image === null ? null : BackendAnswers.read(Resources.windowsCaptureWindowAnswer, image, () => new WindowImage(image.width, image.height, new Uint8Array(image.bgra)));
  }
}
