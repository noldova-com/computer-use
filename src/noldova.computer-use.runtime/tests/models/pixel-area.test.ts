/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect } from "@noldova/computer-use.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { ScreenImages } from "../services/screen-images.fixture.ts";

describe("PixelArea", () => {
  it("shows a granted window from its left and top edges to its right and bottom edges, in the capture's pixels", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(2, 1, 3, 2)])];

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, (x, y) => x >= 2 && x < 5 && y >= 1 && y < 3));
  });
});
