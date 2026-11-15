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

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;

const WHOLE = new DesktopRect(0, 0, 8, 6);

describe("the screenshots' frames", () => {
  it("captures the primary display by default and makes its image the session's frame", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, WHOLE])];

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, () => true));
    assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: 8, height: 6, scale: 1 } });
    assert.deepEqual(harness.backend.capture.requests, ["display-1"]);
  });
});
