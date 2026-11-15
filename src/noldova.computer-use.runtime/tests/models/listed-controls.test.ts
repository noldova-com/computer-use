/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlInfo, ControlRole, ControlTree } from "@noldova/computer-use.runtime";

import { WindowReadHarness } from "../services/window-read-harness.fixture.ts";

const NOTES = WindowReadHarness.notes;
const FRAME = WindowReadHarness.frame;
const NOTES_WINDOW = WindowReadHarness.notesWindow;

describe("the listed controls", () => {
  it("lists at most 500 controls, counting those left out with the backend's own and those under them", async () => {
    const harness = await WindowReadHarness.readyAsync();
    const tree = WindowReadHarness.buttons(501, "");
    harness.backend.controls.set(null, new ControlTree([
      ...tree.controls,
      new ControlInfo("under", "b500", NOTES, ControlRole.Text, "Under", null, [], null),
      new ControlInfo("group", "b500", NOTES, ControlRole.Group, "", null, [], null)
    ], 3, true));

    const { facts, text } = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.deepEqual(facts, { frame: FRAME, window: NOTES_WINDOW, listed: 500, leftOut: 5, timedOut: true });
    assert.equal(text.split("\n").length, 500);
    assert.equal(text.split("\n")[499], "- button at 0,0 1x1 [c500]");
  });
});
