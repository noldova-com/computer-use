/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlInfo, ControlRole, ControlState, ControlTree, DesktopRect } from "@noldova/computer-use.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { WindowReadHarness } from "./window-read-harness.fixture.ts";

const NOTES = WindowReadHarness.notes;
const FRAME = WindowReadHarness.frame;
const NOTES_WINDOW = WindowReadHarness.notesWindow;

describe("the control listing", () => {
  it("cuts a name or a value to 200 characters, and leaves states out when none hold", async () => {
    const harness = await WindowReadHarness.readyAsync();
    const long = "\u{1F600}".repeat(201);
    const whole = "x".repeat(200);
    harness.backend.controls.set(null, new ControlTree([
      new ControlInfo("t", null, NOTES, ControlRole.Text, long, whole, [], new DesktopRect(0, 0, 1, 1)),
      new ControlInfo("u", null, NOTES, ControlRole.Document, "", long, [ControlState.ReadOnly, ControlState.Selected], new DesktopRect(0, 0, 1, 1))
    ], 0, false));

    const { text } = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    const cut = `"${"\u{1F600}".repeat(200)}…"`;
    assert.equal(text, `- text ${cut} = "${whole}" at 0,0 1x1 [c1]\n- document = ${cut} readonly selected at 0,0 1x1 [c2]`);
  });

  it("lists at most 24,000 characters", async () => {
    const harness = await WindowReadHarness.readyAsync();
    harness.backend.controls.set(null, WindowReadHarness.buttons(200, "x".repeat(200)));

    const { facts, text } = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.deepEqual(facts, { frame: FRAME, window: NOTES_WINDOW, listed: 104, leftOut: 96, timedOut: false });
    assert.equal(text, Array.from({ length: 104 }, (_, index) => `- button "${"x".repeat(200)}" at 0,0 1x1 [c${index + 1}]`).join("\n"));
    assert.equal(text.length, 23_811);
  });

  it("leaves out the controls of another app in the window, with those under them, unless that app is granted too", async () => {
    const harness = await WindowReadHarness.readyAsync();
    await harness.grantAppAsync(RuntimeHarness.files);
    const asked = harness.answerer.delivered().length;
    harness.backend.controls.set(null, new ControlTree([
      new ControlInfo("v", null, RuntimeHarness.terminal.identity, ControlRole.Pane, "Console", null, [], new DesktopRect(0, 1, 4, 4)),
      new ControlInfo("o", null, RuntimeHarness.files.identity, ControlRole.Button, "Open", null, [], new DesktopRect(4, 1, 2, 1)),
      new ControlInfo("r", "v", NOTES, ControlRole.Button, "Run", null, [], new DesktopRect(0, 1, 1, 1))
    ], 0, false));

    const read = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.deepEqual(read.facts, { frame: FRAME, window: NOTES_WINDOW, listed: 1, leftOut: 2, timedOut: false });
    assert.equal(read.text, "- button \"Open\" at 4,1 2x1 [c1]");
    assert.equal(harness.answerer.delivered().length, asked);
  });
});
