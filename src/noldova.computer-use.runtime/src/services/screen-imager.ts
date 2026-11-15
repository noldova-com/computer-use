/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { ICaptureBackend } from "../interfaces/backend/i-capture-backend.ts";
import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { AppIdentity } from "../models/backend/app-identity.ts";
import type { Capture } from "../models/backend/capture.ts";
import type { CaptureLayout } from "../models/backend/capture-layout.ts";
import type { DesktopRect } from "../models/backend/desktop-rect.ts";
import type { StackedWindow } from "../models/backend/stacked-window.ts";
import type { WindowImage } from "../models/backend/window-image.ts";
import type { WindowStack } from "../models/backend/window-stack.ts";
import type { Display } from "../models/display.ts";
import { EncodedImage } from "../models/encoded-image.ts";
import type { GrantRecord } from "../models/grant-record.ts";
import type { PixelImage } from "../models/pixel-image.ts";
import { WindowCaptures } from "../models/window-captures.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import { ImageScaler } from "./image-scaler.ts";
import type { PngEncoder } from "./png-encoder.ts";
import type { RememberedGrants } from "./remembered-grants.ts";
import { ScreenMasker } from "./screen-masker.ts";

export class ScreenImager {
  private readonly capture: ICaptureBackend;
  private readonly displays: IDisplayBackend;
  private readonly encoder: PngEncoder;
  private readonly grants: RememberedGrants;
  private readonly record: GrantRecord;
  private readonly windows: IWindowBackend;

  public constructor(displays: IDisplayBackend, windows: IWindowBackend, capture: ICaptureBackend, encoder: PngEncoder, record: GrantRecord, grants: RememberedGrants) {
    this.capture = capture;
    this.displays = displays;
    this.encoder = encoder;
    this.grants = grants;
    this.record = record;
    this.windows = windows;
  }

  public async findDisplayAsync(displayId: string | null, signal: AbortSignal): Promise<Display | undefined> {
    const displays = await this.guardAsync(signal, async () => await this.displays.listDisplaysAsync(signal));

    return displays.find(t => (displayId === null ? t.isPrimary : t.id === displayId));
  }

  public async findDisplayOfAsync(rect: DesktopRect, signal: AbortSignal): Promise<Display | undefined> {
    const displays = await this.guardAsync(signal, async () => await this.displays.listDisplaysAsync(signal));
    const x = rect.x + Math.floor(rect.width / 2);
    const y = rect.y + Math.floor(rect.height / 2);

    return displays.find(t => x >= t.x && y >= t.y && x < t.x + t.width && y < t.y + t.height);
  }

  public async measureAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout> {
    return await this.guardAsync(signal, async () => await this.capture.measureDisplayAsync(displayId, signal));
  }

  public async captureAsync(displayId: string, context: IToolCallContext): Promise<Capture> {
    return await this.guardAsync(context.signal, async () => {
      const layout = await this.capture.measureDisplayAsync(displayId, context.signal);
      const captures = await this.takeAsync(layout, context);
      context.signal.throwIfAborted();

      return ScreenMasker.compose(layout, captures.before, captures.after, captures.images);
    });
  }

  public async encodeAsync(image: PixelImage, scale: number): Promise<EncodedImage> {
    const fitted = ImageScaler.fit(image.width, image.height, scale);
    let encoded = await this.encodeAtAsync(image, fitted.width, fitted.height);
    for (let step = 0; encoded.png.byteLength > Resources.maxImageBytes && step < Resources.imageShrinkSteps; step++)
      encoded = await this.encodeAtAsync(image, Math.max(1, Math.floor(encoded.width * Resources.imageShrinkFactor)), Math.max(1, Math.floor(encoded.height * Resources.imageShrinkFactor)));
    if (encoded.png.byteLength > Resources.maxImageBytes)
      throw CallFailures.of(ToolFailureCode.TooLarge, Resources.formatImageTooLarge(encoded.width, encoded.height));

    return encoded;
  }

  public static scaleOf(value: unknown, message: string): number {
    if (value === undefined)
      return Resources.defaultImageScale;
    if (typeof value !== "number" || !(value >= Resources.minImageScale && value <= 1))
      throw CallFailures.of(ToolFailureCode.Refused, message);

    return value;
  }

  private async takeAsync(layout: CaptureLayout, context: IToolCallContext): Promise<WindowCaptures> {
    const answers = new Map<string, boolean>();
    let before = await this.windows.listStackAsync(context.signal);
    let images = await this.captureShownAsync(layout, before, answers, context);
    let after = await this.windows.listStackAsync(context.signal);
    for (let take = 1; take < Resources.captureTakes && !ScreenMasker.isSame(before, after); take++) {
      before = after;
      images = await this.captureShownAsync(layout, before, answers, context);
      after = await this.windows.listStackAsync(context.signal);
    }

    return new WindowCaptures(before, after, images);
  }

  private async captureShownAsync(layout: CaptureLayout, stack: WindowStack, answers: Map<string, boolean>, context: IToolCallContext): Promise<ReadonlyMap<StackedWindow, WindowImage>> {
    const images = new Map<StackedWindow, WindowImage>();
    if (!stack.isComplete)
      return images;

    for (const window of stack.windows) {
      if (window.app === null || !ScreenMasker.isOnDisplay(layout, window.frame) || !await this.isShownAsync(window.app, answers, context))
        continue;
      const image = await this.capture.captureWindowAsync(window, context.signal);
      if (image !== null)
        images.set(window, image);
    }

    return images;
  }

  private async isShownAsync(app: AppIdentity, answers: Map<string, boolean>, context: IToolCallContext): Promise<boolean> {
    const known = answers.get(app.id);
    if (known !== undefined)
      return known;
    const grant = this.record.find(context.scope, app);
    const isShown = grant !== undefined && await this.grants.isRememberedAsync(grant, context);
    answers.set(app.id, isShown);

    return isShown;
  }

  private async encodeAtAsync(image: PixelImage, width: number, height: number): Promise<EncodedImage> {
    const shrunk = ImageScaler.shrink(image, width, height);

    return new EncodedImage(shrunk.width, shrunk.height, await this.encoder.encodeBgraAsync(shrunk.width, shrunk.height, shrunk.bgra));
  }

  private async guardAsync<T>(signal: AbortSignal, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (signal.aborted)
        throw CallFailures.ofAbort(signal, false);
      if (error instanceof RefusalException)
        throw CallFailures.ofRefusal(error, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.screenCaptureFailed);
    }
  }
}
