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

describe("the image scaler", () => {
  it("shrinks the image by the scale, each pixel the average of those it covers", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, WHOLE])];

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", { scale: 0.5 }));

    assert.deepEqual(image.rows(), Array.from({ length: 3 }, (_, y) => Array.from({ length: 4 }, (_unused, x) => [20 * x + 5, 20 * y + 5, 100])));
    assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: 4, height: 3, scale: 0.5 } });
  });

  for (const [width, height, imageWidth, imageHeight] of [[3136, 100, 1568, 50], [1500, 1000, 1313, 875]] as const)
    it(`fits a ${width} by ${height} capture into ${imageWidth} by ${imageHeight} pixels, within the long edge and the pixel count`, async () => {
      const harness = await ScreenImages.startAsync();
      harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, width, height), width, height));

      const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

      assert.deepEqual([image.width, image.height], [imageWidth, imageHeight]);
      assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: imageWidth, height: imageHeight, scale: imageWidth / width } });
    });
});
