/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, ControlInfo, ControlRole, ControlSpot, ControlState, ControlTree, DesktopPoint, DesktopRect } from "@noldova/computer-use.runtime";
import type { IWindowsControlJson } from "@noldova/computer-use.runtime/windows";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

const NOTES_PATH = WindowsBackendHarness.notesPath;
const NOTES = WindowsBackendHarness.notes;
const TARGET = WindowsBackendHarness.target;
const TARGET_JSON = WindowsBackendHarness.targetJson;

describe("the Windows backend's controls", () => {
  const view = "C:\\Apps\\View.exe";

  function control(handle: string, parentHandle: string | null, controlType: number, name: string, x: number, y: number, width: number, height: number,
    facts: Partial<IWindowsControlJson> = {}): IWindowsControlJson {
    return {
      handle, parentHandle, processId: 42, imagePath: NOTES_PATH, controlType, name, value: null, isEnabled: true, hasFocus: false, isPassword: false,
      isReadOnly: false, isSelected: false, toggleState: -1, expandState: -1, x, y, width, height, ...facts
    };
  }

  it("reads a window's controls with UI Automation's control types and states as the module's, each cut to the controls it lies in", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.controlTree = {
      controls: [
        control("1.1", null, 50010, "Application", 0, 0, 800, 20),
        control("1.2", null, 50004, "Text", 0, 20, 800, 500, { value: "Dear team,", isReadOnly: true }),
        control("1.3", null, 50004, "Password", 0, 520, 300, 24, { isPassword: true }),
        control("1.4", null, 99999, "Strange", 0, 544, 10, 10, { processId: 7, imagePath: view }),
        control("1.5", "1.1", 50011, "File", 10, 0, 40, 30, { hasFocus: true, expandState: 0 }),
        control("1.6", "1.1", 50011, "Far", 900, 0, 40, 20),
        control("1.7", "1.1", 50011, "Below", 10, 50, 40, 20),
        control("1.8", "1.6", 50000, "Inside far", 900, 0, 10, 10),
        control("1.9", "1.2", 50002, "Wrap", 0, 20, 10, 10, { isEnabled: false, toggleState: 1 }),
        control("1.10", "1.2", 50002, "Some", 0, 30, 10, 10, { toggleState: 2 }),
        control("1.11", "1.2", 50013, "On", 0, 40, 10, 10, { isSelected: true }),
        control("1.12", "1.2", 50013, "Off", 0, 50, 10, 10),
        control("1.13", "1.2", 50007, "Row", 0, 60, 10, 10, { isSelected: true }),
        control("1.14", "1.2", 50024, "Open", 0, 70, 10, 10, { expandState: 1 }),
        control("1.15", "1.2", 50024, "Partly", 0, 80, 10, 10, { expandState: 2 }),
        control("1.16", "1.2", 50024, "Leaf", 0, 90, 10, 10, { expandState: 3 })
      ],
      leftOut: 3,
      timedOut: true
    };

    const tree = await backend.controls.readControlsAsync(TARGET, null, HangGuard.signal());

    const rect = (x: number, y: number, width: number, height: number): DesktopRect => new DesktopRect(x, y, width, height);
    assert.deepEqual(tree, new ControlTree([
      new ControlInfo("1.1", null, NOTES, ControlRole.MenuBar, "Application", null, [], rect(0, 0, 800, 20)),
      new ControlInfo("1.2", null, NOTES, ControlRole.Edit, "Text", "Dear team,", [ControlState.ReadOnly], rect(0, 20, 800, 500)),
      new ControlInfo("1.3", null, NOTES, ControlRole.Edit, "Password", null, [ControlState.Password], rect(0, 520, 300, 24)),
      new ControlInfo("1.4", null, AppIdentity.ofWindowsPath(view), ControlRole.Other, "Strange", null, [], rect(0, 544, 10, 10)),
      new ControlInfo("1.5", "1.1", NOTES, ControlRole.MenuItem, "File", null, [ControlState.Focused, ControlState.Collapsed], rect(10, 0, 40, 20)),
      new ControlInfo("1.6", "1.1", NOTES, ControlRole.MenuItem, "Far", null, [], null),
      new ControlInfo("1.7", "1.1", NOTES, ControlRole.MenuItem, "Below", null, [], null),
      new ControlInfo("1.8", "1.6", NOTES, ControlRole.Button, "Inside far", null, [], null),
      new ControlInfo("1.9", "1.2", NOTES, ControlRole.CheckBox, "Wrap", null, [ControlState.Disabled, ControlState.Checked], rect(0, 20, 10, 10)),
      new ControlInfo("1.10", "1.2", NOTES, ControlRole.CheckBox, "Some", null, [ControlState.Mixed], rect(0, 30, 10, 10)),
      new ControlInfo("1.11", "1.2", NOTES, ControlRole.Radio, "On", null, [ControlState.Checked], rect(0, 40, 10, 10)),
      new ControlInfo("1.12", "1.2", NOTES, ControlRole.Radio, "Off", null, [], rect(0, 50, 10, 10)),
      new ControlInfo("1.13", "1.2", NOTES, ControlRole.ListItem, "Row", null, [ControlState.Selected], rect(0, 60, 10, 10)),
      new ControlInfo("1.14", "1.2", NOTES, ControlRole.TreeItem, "Open", null, [ControlState.Expanded], rect(0, 70, 10, 10)),
      new ControlInfo("1.15", "1.2", NOTES, ControlRole.TreeItem, "Partly", null, [ControlState.Expanded], rect(0, 80, 10, 10)),
      new ControlInfo("1.16", "1.2", NOTES, ControlRole.TreeItem, "Leaf", null, [], rect(0, 90, 10, 10))
    ], 3, true));
    assert.deepEqual(api.named("readControls"), [[TARGET_JSON, null, 2000]]);
  });

  it("reads the controls under one by its handle", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await backend.controls.readControlsAsync(TARGET, "1.4", HangGuard.signal());

    assert.deepEqual(api.named("readControls"), [[TARGET_JSON, "1.4", 2000]]);
  });

  it("finds a control again as it is now, within a second, or none", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = HangGuard.signal();

    api.controlSpot = { controlType: 50000, name: "Save", isEnabled: true, isOffscreen: false, x: 5, y: 6 };
    const shown = await backend.controls.findControlAsync(TARGET, "1.2", signal);
    api.controlSpot = { controlType: 50004, name: "Text", isEnabled: false, isOffscreen: true, x: 1, y: 2 };
    const hidden = await backend.controls.findControlAsync(TARGET, "1.3", signal);
    api.controlSpot = null;
    const gone = await backend.controls.findControlAsync(TARGET, "1.4", signal);

    assert.deepEqual([shown, hidden, gone], [
      new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(5, 6)),
      new ControlSpot(ControlRole.Edit, "Text", false, false, new DesktopPoint(1, 2)),
      null
    ]);
    assert.deepEqual(api.named("findControl"), [[TARGET_JSON, "1.2", 1000], [TARGET_JSON, "1.3", 1000], [TARGET_JSON, "1.4", 1000]]);
  });

  it("tells whether the control at a point is the control or one under it, within a second", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = HangGuard.signal();

    const hit = await backend.controls.isControlAtAsync(TARGET, "1.2", new DesktopPoint(3, 4), signal);
    api.isControlHit = false;
    const missed = await backend.controls.isControlAtAsync(TARGET, "1.2", new DesktopPoint(5, 6), signal);

    assert.deepEqual([hit, missed], [true, false]);
    assert.deepEqual(api.named("hitsControl"), [[TARGET_JSON, "1.2", 3, 4, 1000], [TARGET_JSON, "1.2", 5, 6, 1000]]);
  });

  it("asks the addon nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.controls.readControlsAsync(TARGET, "7", AbortSignal.abort()), { name: "AbortError" });
    await assert.rejects(backend.controls.findControlAsync(TARGET, "7", AbortSignal.abort()), { name: "AbortError" });
    await assert.rejects(backend.controls.isControlAtAsync(TARGET, "7", new DesktopPoint(1, 2), AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });

  it("stops waiting for the addon when the call ends during a request, which the addon finishes on its own", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const reason = new Error("The call ended.");
    api.controlWait = new Promise(() => undefined);

    for (const askAsync of [
      async (signal: AbortSignal): Promise<unknown> => await backend.controls.readControlsAsync(TARGET, null, signal),
      async (signal: AbortSignal): Promise<unknown> => await backend.controls.findControlAsync(TARGET, "7", signal),
      async (signal: AbortSignal): Promise<unknown> => await backend.controls.isControlAtAsync(TARGET, "7", new DesktopPoint(1, 2), signal)
    ]) {
      const call = new AbortController();
      const asked = askAsync(call.signal);
      call.abort(reason);

      await assert.rejects(asked, reason);
    }
    assert.deepEqual(api.calls.map(t => t.name), ["readControls", "findControl", "hitsControl"]);
  });
});
