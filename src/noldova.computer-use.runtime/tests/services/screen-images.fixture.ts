/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";

import { type AppIdentity, Capture, DesktopRect, Display, StackedWindow, WindowStack } from "@noldova/computer-use.runtime";
import { ToolContentKind, type ToolResult } from "@noldova/desktop.runtime";

import { PngImage } from "./png-image.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenRead } from "./screen-read.fixture.ts";

export class ScreenImages {
  public static readonly fill: readonly number[] = [64, 64, 64];
  public static readonly primary: Display = new Display("display-1", 0, 0, 8, 6, 1, true);
  public static readonly left: Display = new Display("display-2", -8, 0, 8, 6, 2, false);

  public static async startAsync(): Promise<RuntimeHarness> {
    const harness = await RuntimeHarness.startAsync();
    harness.backend.displays.displays = [ScreenImages.primary, ScreenImages.left];
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 8, 6), 8, 6));
    harness.backend.capture.set(ScreenImages.captureOf("display-2", new DesktopRect(-8, 0, 8, 6), 16, 12));
    await harness.grantAppAsync(RuntimeHarness.notes);

    return harness;
  }

  public static captureOf(displayId: string, frame: DesktopRect, width: number, height: number): Capture {
    const bgra = new Uint8Array(width * height * Capture.bytesPerPixel);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        bgra.set([100, 10 * y, 10 * x, 0], (y * width + x) * Capture.bytesPerPixel);

    return new Capture(displayId, frame, 1, width, height, bgra);
  }

  public static noiseOf(width: number, height: number): Capture {
    const bgra = new Uint8Array(width * height * Capture.bytesPerPixel);
    const words = new Uint32Array(bgra.buffer);
    let state = 2463534242;
    for (let index = 0; index < words.length; index++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      words[index] = state >>> 0;
    }

    return new Capture("display-1", new DesktopRect(0, 0, width, height), 1, width, height, bgra);
  }

  public static stackOf(...windows: readonly (readonly [AppIdentity | null, DesktopRect, string?])[]): WindowStack {
    return new WindowStack(true, windows.map((t, index) => new StackedWindow(t[0], t[2] ?? `${index + 1}`, t[1])));
  }

  public static expectedRows(width: number, height: number, isShown: (x: number, y: number) => boolean): readonly (readonly (readonly number[])[])[] {
    return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_unused, x) => (isShown(x, y) ? [10 * x, 10 * y, 100] : ScreenImages.fill)));
  }

  public static read(result: ToolResult): ScreenRead {
    assert.equal(result.structured, null);
    assert.equal(result.content.length, 2);
    const [image, text] = result.content;
    assert.ok(image !== undefined && text !== undefined);
    assert.equal(image.kind, ToolContentKind.Image);
    assert.equal(image.mimeType, "image/png");
    assert.equal(image.origin, "computer-use:screen");
    assert.equal(image.isUntrusted, true);
    assert.equal(text.kind, ToolContentKind.Text);
    assert.equal(text.isUntrusted, false);

    const parsed: unknown = JSON.parse(text.value);

    return new ScreenRead(PngImage.read(Buffer.from(image.value, "base64")), parsed);
  }
}
