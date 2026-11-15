/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";
import { WindowReadHarness } from "./window-read-harness.fixture.ts";

const NOTES = WindowReadHarness.notes;
const WINDOW = WindowReadHarness.window;

describe("the window readings", () => {
  it("fails as stale for an ID of no read, of another window's, or of a read in an older frame", async () => {
    const harness = await WindowReadHarness.readyAsync();
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", { control: "c1" }), ToolFailureCode.Stale);
    await harness.callAsync("computer_read_window", {});
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", { control: "c9" }), ToolFailureCode.Stale);

    harness.windows.foreground = new WindowInfo(NOTES, "Notes", "101", 42, new DesktopRect(0, 0, 8, 6), false);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", { control: "c1" }), ToolFailureCode.Stale);
    harness.windows.foreground = WINDOW;
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 10, 6), 10, 6));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", { control: "c1" }), ToolFailureCode.Stale);
    assert.deepEqual(harness.backend.controls.reads, [null]);
  });
});
