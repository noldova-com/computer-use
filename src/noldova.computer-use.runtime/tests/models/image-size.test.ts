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

import { ScreenImages } from "../services/screen-images.fixture.ts";

describe("ImageSize", () => {
  it("gives the screenshot the width and height its capture fits into, each at least one pixel", async () => {
    const harness = await ScreenImages.startAsync();
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 3136, 1), 3136, 1));

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual([image.width, image.height], [1568, 1]);
    assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: 1568, height: 1, scale: 0.5 } });
  });
});
