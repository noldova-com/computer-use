/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { endianness } from "node:os";

import { Capture } from "../models/backend/capture.ts";
import type { CaptureLayout } from "../models/backend/capture-layout.ts";
import type { DesktopRect } from "../models/backend/desktop-rect.ts";
import type { StackedWindow } from "../models/backend/stacked-window.ts";
import type { WindowImage } from "../models/backend/window-image.ts";
import { WindowStack } from "../models/backend/window-stack.ts";
import { PixelArea } from "../models/pixel-area.ts";
import { Resources } from "../resources.ts";

export class ScreenMasker {
  public static compose(layout: CaptureLayout, before: WindowStack, after: WindowStack, images: ReadonlyMap<StackedWindow, WindowImage>): Capture {
    const front = ScreenMasker.frontOf(before, after);
    const owners = ScreenMasker.paint(layout, front, images);
    const bgra = new Uint8Array(layout.width * layout.height * Capture.bytesPerPixel);
    const fill = new DataView(Uint8Array.of(Resources.maskFill, Resources.maskFill, Resources.maskFill, Resources.opaqueAlpha).buffer).getUint32(0, endianness() === Resources.littleEndian);
    new Uint32Array(bgra.buffer).fill(fill);
    front.windows.forEach((window, index) => {
      const image = images.get(window);
      if (image !== undefined)
        ScreenMasker.draw(layout, bgra, owners, index, window.frame, image);
    });

    return new Capture(layout.displayId, layout.frame, layout.scaleFactor, layout.width, layout.height, bgra);
  }

  public static isSame(before: WindowStack, after: WindowStack): boolean {
    return before.windows.length === after.windows.length && ScreenMasker.frontOf(before, after).windows.length === before.windows.length && before.isComplete && after.isComplete;
  }

  public static isOnDisplay(layout: CaptureLayout, frame: DesktopRect): boolean {
    return frame.x < layout.frame.x + layout.frame.width && frame.x + frame.width > layout.frame.x
      && frame.y < layout.frame.y + layout.frame.height && frame.y + frame.height > layout.frame.y;
  }

  private static frontOf(before: WindowStack, after: WindowStack): WindowStack {
    const count = before.windows.findIndex((t, index) => !ScreenMasker.isSameWindow(t, after.windows[index]));

    return new WindowStack(before.isComplete && after.isComplete, before.windows.slice(0, count === -1 ? before.windows.length : count));
  }

  private static isSameWindow(window: StackedWindow, other: StackedWindow | undefined): boolean {
    return other !== undefined && window.windowId === other.windowId && window.app?.id === other.app?.id && window.frame.x === other.frame.x
      && window.frame.y === other.frame.y && window.frame.width === other.frame.width && window.frame.height === other.frame.height;
  }

  private static paint(layout: CaptureLayout, stack: WindowStack, images: ReadonlyMap<StackedWindow, WindowImage>): Int32Array {
    const owners = new Int32Array(layout.width * layout.height).fill(-1);
    if (!stack.isComplete)
      return owners;

    for (const [index, window] of [...stack.windows.entries()].reverse()) {
      const outer = ScreenMasker.toPixels(layout, window.frame, Math.floor, Math.ceil);
      const inner = images.has(window) ? ScreenMasker.toPixels(layout, window.frame, Math.ceil, Math.floor) : null;
      for (let y = outer.top; y < outer.bottom; y++) {
        const row = y * layout.width;
        owners.fill(-1, row + outer.left, row + outer.right);
        if (inner !== null && y >= inner.top && y < inner.bottom)
          owners.fill(index, row + inner.left, row + inner.right);
      }
    }

    return owners;
  }

  private static draw(layout: CaptureLayout, bgra: Uint8Array, owners: Int32Array, index: number, frame: DesktopRect, image: WindowImage): void {
    const sourceOf = (pixel: number, origin: number, span: number, size: number, start: number, length: number, imageSize: number): number =>
      Math.min(Math.max(Math.floor((origin + (pixel + 0.5) * span / size - start) * imageSize / length), 0), imageSize - 1);
    const area = ScreenMasker.toPixels(layout, frame, Math.ceil, Math.floor);
    for (let y = area.top; y < area.bottom; y++) {
      const sourceRow = sourceOf(y, layout.frame.y, layout.frame.height, layout.height, frame.y, frame.height, image.height) * image.width;
      for (let x = area.left; x < area.right; x++) {
        const pixel = y * layout.width + x;
        if (owners[pixel] !== index)
          continue;
        const source = (sourceRow + sourceOf(x, layout.frame.x, layout.frame.width, layout.width, frame.x, frame.width, image.width)) * Capture.bytesPerPixel;
        bgra.set(image.bgra.subarray(source, source + Resources.colourBytes), pixel * Capture.bytesPerPixel);
      }
    }
  }

  private static toPixels(layout: CaptureLayout, rect: DesktopRect, start: (value: number) => number, end: (value: number) => number): PixelArea {
    const scaleX = layout.width / layout.frame.width;
    const scaleY = layout.height / layout.frame.height;
    const clamp = (value: number, size: number): number => Math.min(Math.max(value, 0), size);

    return new PixelArea(clamp(start((rect.x - layout.frame.x) * scaleX), layout.width), clamp(start((rect.y - layout.frame.y) * scaleY), layout.height),
      clamp(end((rect.x + rect.width - layout.frame.x) * scaleX), layout.width), clamp(end((rect.y + rect.height - layout.frame.y) * scaleY), layout.height));
  }
}
