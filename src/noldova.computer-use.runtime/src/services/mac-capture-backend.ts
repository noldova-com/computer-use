/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MacCaptureFailedException } from "../exceptions/mac-capture-failed.exception.ts";
import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { ICaptureBackend } from "../interfaces/backend/i-capture-backend.ts";
import type { IMacScreenCapturer } from "../interfaces/i-mac-screen-capturer.ts";
import { CaptureLayout } from "../models/backend/capture-layout.ts";
import { DesktopRect } from "../models/backend/desktop-rect.ts";
import { RefusalReason } from "../models/backend/refusal-reason.ts";
import type { StackedWindow } from "../models/backend/stacked-window.ts";
import { WindowImage } from "../models/backend/window-image.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";
import type { PngDecoder } from "./png-decoder.ts";

export class MacCaptureBackend implements ICaptureBackend {
  private readonly api: MacDesktopApi;
  private readonly capturer: IMacScreenCapturer;
  private readonly decoder: PngDecoder;

  public constructor(api: MacDesktopApi, capturer: IMacScreenCapturer, decoder: PngDecoder) {
    this.api = api;
    this.capturer = capturer;
    this.decoder = decoder;
  }

  public async measureDisplayAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout> {
    signal.throwIfAborted();
    await this.checkGrantAsync();
    const display = (await this.api.listDisplaysAsync()).find(t => t.id === displayId);
    if (display === undefined)
      throw new RefusalException(RefusalReason.OutsideDisplays, false);

    return BackendAnswers.read(Resources.macScriptMethods.listDisplays, display, () => new CaptureLayout(display.id, new DesktopRect(display.x, display.y, display.width, display.height),
      display.scaleFactor, Math.round(display.width * display.scaleFactor), Math.round(display.height * display.scaleFactor)));
  }

  public async captureWindowAsync(window: StackedWindow, signal: AbortSignal): Promise<WindowImage | null> {
    signal.throwIfAborted();
    await this.checkGrantAsync();
    if (!(await this.isShownAsync(window)))
      return null;

    const png = await this.capturer.captureWindowAsync(window.windowId, signal).catch(async (error: unknown) => {
      signal.throwIfAborted();
      if (!(error instanceof MacCaptureFailedException) || await this.isShownAsync(window))
        throw error;

      return null;
    });
    if (png === null)
      return null;
    const image = await this.decoder.decodeAsync(png);

    return new WindowImage(image.width, image.height, image.bgra);
  }

  private async checkGrantAsync(): Promise<void> {
    if (!(await this.api.checkGrantsAsync()).screenRecording)
      throw new RefusalException(RefusalReason.DesktopOnlyCapture, false);
  }

  private async isShownAsync(window: StackedWindow): Promise<boolean> {
    const shown = await this.api.readWindowAsync(window.windowId);
    const frame = window.frame;

    return shown !== null && shown.bundleId === window.app?.id && shown.x === frame.x && shown.y === frame.y
      && shown.width === frame.width && shown.height === frame.height;
  }
}
