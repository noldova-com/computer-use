/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { ControlInfo, ControlRole, ControlTree, DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";
import { ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";
import { WindowReadHarness } from "./window-read-harness.fixture.ts";

const NOTES = WindowReadHarness.notes;
const WINDOW = WindowReadHarness.window;
const FRAME = WindowReadHarness.frame;
const NOTES_WINDOW = WindowReadHarness.notesWindow;
const TREE = WindowReadHarness.tree;

const LISTING = [
  "- menubar \"Application\"",
  "  - menuitem \"File\" at 1,0 2x1 [c1]",
  "- edit \"Text\" = \"Dear \\\"team\\\",\\nhello\" focused at 0,1 8x4 [c2]",
  "- edit \"Password\" password at 0,5 3x1 [c3]",
  "- button \"Save\" disabled at 6,5 2x1 [c4]"
].join("\n");

describe("computer_read_window", () => {
  it("lists the window's controls by level, with an ID for each that shows, in a new frame of the window's display", async () => {
    const harness = await WindowReadHarness.readyAsync();

    const { facts, text } = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.equal(text, LISTING);
    assert.deepEqual(facts, { frame: FRAME, window: NOTES_WINDOW, listed: 5, leftOut: 0, timedOut: false });
    assert.deepEqual(harness.backend.controls.reads, [null]);
    assert.equal(harness.backend.controls.targets[0], WINDOW.target);
    const zoom = await harness.callAsync("computer_zoom", { region: [0, 0, 1, 1] });
    assert.deepEqual(JSON.parse(zoom.content[1]?.value ?? ""), { zoom: { frame: "1", region: [0, 0, 1, 1], width: 1, height: 1 } });
  });

  it("keeps the latest screenshot's frame while it shows the window's display as it is", async () => {
    const harness = await WindowReadHarness.readyAsync();
    await harness.callAsync("computer_screenshot", {});

    const { facts } = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.deepEqual(facts, { frame: FRAME, window: NOTES_WINDOW, listed: 5, leftOut: 0, timedOut: false });
  });

  it("sets a new frame when the window lies on another display, or the display changed after the latest frame", async () => {
    const harness = await WindowReadHarness.readyAsync();
    await harness.callAsync("computer_screenshot", {});
    harness.windows.foreground = new WindowInfo(NOTES, "Notes", "200", 42, new DesktopRect(-8, 0, 8, 6), false);
    harness.backend.controls.set(null, new ControlTree([
      new ControlInfo("a", null, NOTES, ControlRole.Button, "Inside", null, [], new DesktopRect(-7, 1, 2, 1)),
      new ControlInfo("b", null, NOTES, ControlRole.Button, "Across", null, [], new DesktopRect(-9, 0, 2, 1)),
      new ControlInfo("c", null, NOTES, ControlRole.Button, "Beyond", null, [], new DesktopRect(5, 0, 2, 1)),
      new ControlInfo("d", null, NOTES, ControlRole.Button, "Nowhere", null, [], null)
    ], 0, false));

    const left = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.deepEqual(left.facts, { frame: { id: "2", display: "display-2", width: 16, height: 12, scale: 2 }, window: NOTES_WINDOW, listed: 4, leftOut: 0, timedOut: false });
    assert.equal(left.text, "- button \"Inside\" at 2,2 4x2 [c1]\n- button \"Across\" at 0,0 2x2 [c2]\n- button \"Beyond\"\n- button \"Nowhere\"");

    harness.windows.foreground = WINDOW;
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 10, 6), 10, 6));
    const changed = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));
    assert.deepEqual(changed.facts, { frame: { id: "3", display: "display-1", width: 10, height: 6, scale: 1 }, window: NOTES_WINDOW, listed: 4, leftOut: 0, timedOut: false });
  });

  const refused: readonly JsonObject[] = [{ control: "" }, { control: 1 }, { control: "c1", scale: 1 }];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)}`, async () => {
      const harness = await WindowReadHarness.readyAsync();

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_read_window", input), ToolFailureCode.Refused, /^computer_read_window takes an optional control/);
    });

  it("refuses when no window is in front, or the window in front runs with higher rights or belongs to an app that isn't granted", async () => {
    const harness = await WindowReadHarness.readyAsync();

    harness.windows.foreground = null;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", {}), ToolFailureCode.Refused, /^No app's window is in front/);
    harness.windows.foreground = new WindowInfo(NOTES, "Notes", "100", 42, new DesktopRect(0, 0, 8, 6), true);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", {}), ToolFailureCode.Refused, /higher rights/);
    harness.windows.foreground = new WindowInfo(RuntimeHarness.terminal.identity, "Command Prompt", "100", 42, new DesktopRect(0, 0, 8, 6), false);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", {}), ToolFailureCode.Refused, /^Command Prompt isn't granted to this session\./);
    assert.deepEqual(harness.backend.controls.reads, []);
  });

  it("refuses an app whose grant was revoked in the app's settings, without asking the person", async () => {
    const harness = await WindowReadHarness.readyAsync();
    const asked = harness.answerer.delivered().length;
    for (const answer of harness.center.remembered().filter(t => t.action === "computer-use.controlApp"))
      harness.center.forget(answer);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", {}), ToolFailureCode.Refused, /^Notes isn't granted to this session\./);
    assert.equal(harness.answerer.delivered().length, asked);
    assert.deepEqual(harness.center.records().slice(-1).map(t => [t.action, t.subject, t.isRemembered]), [["computer-use.controlApp", NOTES.id, false]]);
    assert.deepEqual(harness.backend.controls.reads, []);
  });

  it("refuses a window that lies on no display", async () => {
    const harness = await WindowReadHarness.readyAsync();
    harness.windows.foreground = new WindowInfo(NOTES, "Notes", "100", 42, new DesktopRect(20, 0, 8, 6), false);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_read_window", {}), ToolFailureCode.Refused, /^The action was refused: no display covers its point or display\.$/);
    assert.deepEqual(harness.backend.controls.reads, []);
  });

  it("fails as unavailable, keeping the backend's failure as its cause, when the window or the displays can't be read", async () => {
    const harness = await WindowReadHarness.readyAsync();
    const controlsFailure = new BackendFailureException("readControls");
    const displaysFailure = new BackendFailureException("listDisplays");

    harness.backend.controls.failure = controlsFailure;
    await assert.rejects(harness.callDirectlyAsync("computer_read_window", {}), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.failure.message === "The window in front could not be read." && error.cause === controlsFailure);
    harness.backend.controls.failure = undefined;
    harness.backend.displays.failure = displaysFailure;
    await assert.rejects(harness.callDirectlyAsync("computer_read_window", {}), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.failure.message === "The screen could not be captured." && error.cause === displaysFailure);
  });

  it("passes on a failure to read the window or the displays that isn't the backend's own as it is", async () => {
    const harness = await WindowReadHarness.readyAsync();
    const defect = new TypeError("A defect in the module.");

    harness.backend.controls.failure = defect;
    await assert.rejects(harness.callDirectlyAsync("computer_read_window", {}), (error: unknown) => error === defect);
    harness.backend.controls.failure = undefined;
    harness.backend.displays.failure = defect;
    await assert.rejects(harness.callDirectlyAsync("computer_read_window", {}), (error: unknown) => error === defect);
  });

  it("fails by the call's end when it ends while the grant is checked or the window is read", async () => {
    let ending: AbortController | null = null;
    const harness = await WindowReadHarness.readyAsync(() => {
      ending?.abort(ToolAbortReason.Cancelled);

      return null;
    });
    ending = new AbortController();
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_read_window", {}, ending.signal), ToolFailureCode.Cancelled);
    ending = null;

    const failing = new AbortController();
    harness.backend.controls.readControlsAsync = async () => {
      failing.abort(ToolAbortReason.Cancelled);
      throw new Error("The read stopped.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_read_window", {}, failing.signal), ToolFailureCode.Cancelled);

    const reading = new AbortController();
    harness.backend.controls.readControlsAsync = async () => {
      reading.abort(ToolAbortReason.Cancelled);

      return TREE;
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_read_window", {}, reading.signal), ToolFailureCode.Cancelled);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_zoom", { region: [0, 0, 1, 1] }), ToolFailureCode.Refused, /^There is no full screenshot/);
  });
});
