/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect, WindowImage } from "@noldova/computer-use.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { ScreenImages } from "../services/screen-images.fixture.ts";

describe("WindowCaptures", () => {
  it("masks with the window lists taken before and after the capture, drawing each granted window from the image taken between them", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(2, 1, 2, 1)])];
    harness.backend.capture.setWindow("1", new WindowImage(2, 1, Uint8Array.of(1, 2, 3, 0, 4, 5, 6, 0)));

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows()[1]?.slice(1, 5), [ScreenImages.fill, [3, 2, 1], [6, 5, 4], ScreenImages.fill]);
    assert.deepEqual([harness.backend.capture.windows, harness.windows.stackListings], [["1"], 2]);
  });
});
