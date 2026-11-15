/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScreenImages } from "../services/screen-images.fixture.ts";

describe("an image point", () => {
  it("gives a move's pixel in the screenshot, and names it in the request", async () => {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", { scale: 0.5 });

    const result = await harness.callAsync("computer_move", { x: 3, y: 0 });

    assert.deepEqual(result.structured, { moved: [3, 0] });
    assert.deepEqual(harness.center.records().at(-1)?.details.filter(t => t.name === "point"), [{ name: "point", value: "3, 0" }]);
  });
});
