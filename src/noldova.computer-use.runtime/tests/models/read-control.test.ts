/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlInfo, ControlRole, ControlSpot, ControlTree, DesktopPoint, DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { ScreenImages } from "../services/screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;

const WINDOW = new WindowInfo(NOTES, "Notes", "100", 42, new DesktopRect(0, 0, 8, 6), false);

const SAVE = new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(7, 5));

const TEXT = new ControlSpot(ControlRole.Edit, "Text", true, true, new DesktopPoint(4, 3));

const MOVED = /^The control moved since the window was read: its point lies outside the bounds the read gave it\. Nothing was sent\. Read the window again\.$/;

describe("a read control", () => {
  const summary = "Saves the note.";

  async function readAsync(): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    harness.windows.foreground = WINDOW;
    harness.backend.controls.set(null, new ControlTree([
      new ControlInfo("s", null, NOTES, ControlRole.Button, "Save", null, [], new DesktopRect(6, 5, 2, 1)),
      new ControlInfo("t", null, NOTES, ControlRole.Edit, "Text", "Dear team,", [], new DesktopRect(0, 1, 8, 4)),
      new ControlInfo("w", null, NOTES, ControlRole.Button, "Wide", null, [], new DesktopRect(7, 0, 3, 1))
    ], 0, false));
    await harness.callAsync("computer_read_window", {});
    harness.backend.controls.setSpot("s", SAVE);
    harness.backend.controls.setSpot("t", TEXT);

    return harness;
  }

  it("fails as stale when the control's point lies outside the bounds the read gave it, or outside the frame", async () => {
    const harness = await readAsync();

    harness.backend.controls.setSpot("s", new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(5, 5)));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, MOVED);
    harness.backend.controls.setSpot("w", new ControlSpot(ControlRole.Button, "Wide", true, true, new DesktopPoint(9, 0)));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c3", summary }), ToolFailureCode.Stale, MOVED);
    assert.deepEqual(harness.input.sent, []);
  });
});
