/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlInfo, ControlRole, ControlTree, DesktopRect } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { WindowReadHarness } from "../services/window-read-harness.fixture.ts";

const NOTES = WindowReadHarness.notes;
const FRAME = WindowReadHarness.frame;
const NOTES_WINDOW = WindowReadHarness.notesWindow;

describe("a window's reading", () => {
  it("reads under a control by its ID, whose IDs continue the read's, which stay valid until the next whole read", async () => {
    const harness = await WindowReadHarness.readyAsync();
    await harness.callAsync("computer_read_window", {});
    harness.backend.controls.set("e", new ControlTree([
      new ControlInfo("e1", null, NOTES, ControlRole.Text, "Line one", null, [], new DesktopRect(0, 1, 4, 1)),
      new ControlInfo("e2", null, NOTES, ControlRole.Text, "Line two", null, [], new DesktopRect(0, 2, 4, 1))
    ], 0, false));

    const under = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", { control: "c2" }));

    assert.deepEqual(under.facts, { frame: FRAME, window: NOTES_WINDOW, under: "c2", listed: 2, leftOut: 0, timedOut: false });
    assert.equal(under.text, "- text \"Line one\" at 0,1 4x1 [c5]\n- text \"Line two\" at 0,2 4x1 [c6]");
    WindowReadHarness.readOf(await harness.callAsync("computer_read_window", { control: "c5" }));
    WindowReadHarness.readOf(await harness.callAsync("computer_read_window", { control: "c1" }));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", { control: "c5" }), ToolFailureCode.Stale);
    WindowReadHarness.readOf(await harness.callAsync("computer_read_window", { control: "c3" }));
    assert.deepEqual(harness.backend.controls.reads, [null, "e", "e1", "f", "w"]);

    const again = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));
    assert.match(again.text, /\[c7\]$/mu);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", { control: "c1" }), ToolFailureCode.Stale, /^The control isn't an ID of the latest read of this window in this frame\. Read the window again\.$/);
  });
});
