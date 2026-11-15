/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ToolFailureCode } from "@noldova/desktop.runtime";

import { ClickCalls } from "./click-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("a pixel aim", () => {
  it("refuses a point before the session's first screenshot, or outside the latest one, before raising anything", async () => {
    const harness = await ScreenImages.startAsync();
    const before = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Refused, /^There is no full screenshot for the point to refer to yet\./);
    assert.equal(harness.center.records().length, before);
    await harness.callAsync("computer_screenshot", {});
    const asked = harness.center.records().length;
    for (const [x, y] of [[8, 0], [0, 6]] as const)
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(x, y)), ToolFailureCode.Refused, /^The point must be inside the latest full screenshot, 8 by 6 pixels\. Nothing was sent\.$/);
    for (const [x, y] of [[-1, 0], [0, -1]] as const)
      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(x, y)), ToolFailureCode.Refused, /^The point must be inside the latest full screenshot, 8 by 6 pixels\. Nothing was sent\.$/);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });
});
