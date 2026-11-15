/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect, RefusalReason } from "@noldova/computer-use.runtime";
import { ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { ClickCalls } from "./click-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("the screen points", () => {
  it("fails as stale when the display moved, changed size or went after the screenshot, and as unavailable, keeping the backend's failure as its cause, when it can't be measured", async () => {
    const harness = await ClickCalls.shotAsync();
    const asked = harness.center.records().length;

    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 10, 6), 10, 6));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Stale, /^The display changed after the latest full screenshot\./);
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(1, 0, 8, 6), 8, 6));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Stale, /^The display changed/);
    harness.backend.capture.refusal = RefusalReason.OutsideDisplays;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Stale, /no display covers/);
    harness.backend.capture.refusal = null;
    const failure = new BackendFailureException("The display list is broken.");
    harness.backend.capture.measureDisplayAsync = async () => {
      throw failure;
    };
    await assert.rejects(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0)), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && /^The display could not be measured/u.test(error.failure.message) && error.cause === failure);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails by the call's end when it ends while the display is measured", async () => {
    const harness = await ClickCalls.shotAsync();
    const controller = new AbortController();
    harness.backend.capture.measureDisplayAsync = async () => {
      controller.abort(ToolAbortReason.Cancelled);
      throw new Error("The measure stopped.");
    };

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0), controller.signal), ToolFailureCode.Cancelled);
    assert.deepEqual(harness.input.sent, []);
  });
});
