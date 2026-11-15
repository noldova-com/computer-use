/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect, WindowImage, WindowStack } from "@noldova/computer-use.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;

const TERMINAL = RuntimeHarness.terminal.identity;

const HOST = RuntimeHarness.host.identity;

const WHOLE = new DesktopRect(0, 0, 8, 6);

describe("the screen masker", () => {
  it("shows only the visible parts of the granted app's windows, captured on their own, and covers every other window and the desktop", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf(
      [TERMINAL, new DesktopRect(-2, 0, 5, 6)],
      [null, new DesktopRect(6, 4, 2, 2)],
      [NOTES, new DesktopRect(1, 0, 7, 5)],
      [HOST, WHOLE]
    )];

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, (x, y) => x >= 3 && y < 5 && !(x >= 6 && y >= 4)));
    assert.deepEqual(harness.backend.capture.windows, ["3"]);
    assert.equal(harness.windows.stackListings, 2);
  });

  it("draws each granted window from its own image, whatever the screen shows at its frame", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(2, 1, 2, 1)])];
    harness.backend.capture.setWindow("1", new WindowImage(2, 1, Uint8Array.of(1, 2, 3, 0, 4, 5, 6, 0)));

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows()[1]?.slice(1, 5), [ScreenImages.fill, [3, 2, 1], [6, 5, 4], ScreenImages.fill]);
  });

  it("covers a granted window the backend can't draw at its frame", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 4, 6)], [NOTES, WHOLE])];
    harness.backend.capture.setWindow("1", null);

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, x => x >= 4));
    assert.deepEqual(harness.backend.capture.windows, ["1", "2"]);
  });

  for (const stacks of [[new WindowStack(false, ScreenImages.stackOf([NOTES, WHOLE]).windows)], [ScreenImages.stackOf([NOTES, WHOLE]), new WindowStack(false, [])]])
    it(`covers everything when ${stacks.length === 1 ? "the list before" : "the list after"} the capture is incomplete`, async () => {
      const harness = await ScreenImages.startAsync();
      harness.windows.stacks = stacks;

      const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

      assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, () => false));
    });

  it("covers the pixels a window's edge only partly covers, at a display's fractional scale, and draws the rest from its image", async () => {
    const harness = await ScreenImages.startAsync();
    harness.backend.capture.set(ScreenImages.captureOf("display-1", WHOLE, 12, 9));
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(1, 1, 2, 2)])];

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    const isShown = (x: number, y: number): boolean => x >= 2 && x < 4 && y >= 2 && y < 4;
    assert.deepEqual(image.rows(), Array.from({ length: 9 }, (_, y) => Array.from({ length: 12 }, (_unused, x) => (isShown(x, y) ? [10 * (x + 1), 10 * (y + 1), 100] : ScreenImages.fill))));
    assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: 12, height: 9, scale: 1.5 } });
  });
});
