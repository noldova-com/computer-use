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

describe("an encoded image", () => {
  it("gives the screenshot's frame the size of the PNG it hands the agent", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6)])];

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", { scale: 0.5 }));

    assert.deepEqual([image.width, image.height], [4, 3]);
    assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: image.width, height: image.height, scale: 0.5 } });
  });
});
