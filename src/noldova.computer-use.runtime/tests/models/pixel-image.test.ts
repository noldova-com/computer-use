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

describe("a pixel image", () => {
  it("holds a zoom's region as the capture's own pixels, row by row", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6)])];
    await harness.callAsync("computer_screenshot", {});

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_zoom", { region: [2, 0, 4, 3] }));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, () => true).slice(0, 3).map(t => t.slice(2, 4)));
    assert.deepEqual(text, { zoom: { frame: "1", region: [2, 0, 4, 3], width: 2, height: 3 } });
  });
});
