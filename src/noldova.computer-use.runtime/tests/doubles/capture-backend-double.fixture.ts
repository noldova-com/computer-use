/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CaptureLayout, RefusalException, RefusalReason, WindowImage } from "@noldova/computer-use.runtime";
import type { Capture, ICaptureBackend, StackedWindow } from "@noldova/computer-use.runtime";

export class CaptureBackendDouble implements ICaptureBackend {
  private readonly images: Map<string, WindowImage | null> = new Map();
  private readonly screens: Map<string, Capture>;

  public refusal: RefusalReason | null = null;
  public readonly requests: string[] = [];
  public readonly windows: string[] = [];

  public constructor(screens: readonly Capture[]) {
    this.screens = new Map(screens.map(t => [t.displayId, t]));
  }

  public set(screen: Capture): void {
    this.screens.set(screen.displayId, screen);
  }

  public setWindow(windowId: string, image: WindowImage | null): void {
    this.images.set(windowId, image);
  }

  public async measureDisplayAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout> {
    signal.throwIfAborted();
    if (this.refusal !== null)
      throw new RefusalException(this.refusal, false);

    const screen = this.screens.get(displayId);
    if (screen === undefined)
      throw new RefusalException(RefusalReason.OutsideDisplays, false);

    this.requests.push(displayId);

    return new CaptureLayout(screen.displayId, screen.frame, screen.scaleFactor, screen.width, screen.height);
  }

  public async captureWindowAsync(window: StackedWindow, signal: AbortSignal): Promise<WindowImage | null> {
    signal.throwIfAborted();
    if (this.refusal !== null)
      throw new RefusalException(this.refusal, false);

    this.windows.push(window.windowId);
    const image = this.images.get(window.windowId);

    return image !== undefined ? image : this.drawn(window);
  }

  private drawn(window: StackedWindow): WindowImage | null {
    const { x, y, width, height } = window.frame;
    const screen = [...this.screens.values()].find(t => x >= t.frame.x && x < t.frame.x + t.frame.width && y >= t.frame.y && y < t.frame.y + t.frame.height);
    if (screen === undefined)
      return null;
    const scaleX = screen.width / screen.frame.width;
    const scaleY = screen.height / screen.frame.height;
    const imageWidth = Math.max(1, Math.round(width * scaleX));
    const imageHeight = Math.max(1, Math.round(height * scaleY));
    const bgra = new Uint8Array(imageWidth * imageHeight * WindowImage.bytesPerPixel);
    for (let row = 0; row < imageHeight; row++)
      for (let column = 0; column < imageWidth; column++) {
        const screenX = Math.min(Math.floor((x - screen.frame.x + (column + 0.5) * width / imageWidth) * scaleX), screen.width - 1);
        const screenY = Math.min(Math.floor((y - screen.frame.y + (row + 0.5) * height / imageHeight) * scaleY), screen.height - 1);
        const at = (screenY * screen.width + screenX) * WindowImage.bytesPerPixel;
        bgra.set(screen.bgra.subarray(at, at + WindowImage.bytesPerPixel), (row * imageWidth + column) * WindowImage.bytesPerPixel);
      }

    return new WindowImage(imageWidth, imageHeight, bgra);
  }
}
