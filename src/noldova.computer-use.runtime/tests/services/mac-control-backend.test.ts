/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { AppIdentity, ControlInfo, ControlRole, ControlSpot, ControlState, ControlTree, DesktopPoint, DesktopRect } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const NOTES = MacBackendHarness.notes;
const TARGET = MacBackendHarness.target;
const TARGET_JSON = MacBackendHarness.targetJson;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's controls", () => {
  function control(handle: string, parentHandle: string | null, role: string, subrole: string, name: string, x: number, y: number, width: number, height: number,
    facts: object = {}): object {
    return {
      handle, parentHandle, bundleId: "com.example.notes", role, subrole, name, value: null, isEnabled: true, isFocused: false, isSelected: false, checkState: -1,
      isExpanded: null, x, y, width, height, ...facts
    };
  }

  it("reads a window's controls slice by slice, with the Accessibility API's roles, subroles and states as the module's, each cut to the controls it lies in", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("readControls", {
      read: 3,
      controls: [
        control("3.0", null, "AXMenuBar", "", "Application", 0, 0, 800, 20),
        control("3.1", null, "AXTextArea", "", "Text", 0, 20, 800, 500, { value: "Dear team,", isFocused: true }),
        control("3.2", null, "AXTextField", "AXSecureTextField", "Password", 0, 520, 300, 24),
        control("3.3", null, "AXStrange", "", "Strange", 0, 544, 10, 10, { bundleId: "com.example.view" }),
        control("3.4", "3.0", "AXMenuBarItem", "", "File", 10, 0, 40, 30, { isExpanded: false })
      ],
      leftOut: 1,
      timedOut: false,
      isDone: false
    });
    channel.answers.set("continueControls", {
      read: 3,
      controls: [
        control("3.5", "3.1", "AXCheckBox", "", "Wrap", 0, 20, 10, 10, { isEnabled: false, checkState: 1 }),
        control("3.6", "3.1", "AXCheckBox", "AXSwitch", "Some", 0, 30, 10, 10, { checkState: 2 }),
        control("3.7", "3.1", "AXRadioButton", "AXTabButton", "Tab", 0, 40, 10, 10, { isSelected: true }),
        control("3.8", "3.1", "AXRow", "AXOutlineRow", "Open", 0, 50, 10, 10, { isExpanded: true, checkState: 0 }),
        control("3.9", "3.3", "AXButton", "", "Far", 900, 0, 10, 10)
      ],
      leftOut: 4,
      timedOut: true,
      isDone: true
    });

    const tree = await backend.controls.readControlsAsync(TARGET, null, HangGuard.signal());

    const rect = (x: number, y: number, width: number, height: number): DesktopRect => new DesktopRect(x, y, width, height);
    assert.deepEqual(tree, new ControlTree([
      new ControlInfo("3.0", null, NOTES, ControlRole.MenuBar, "Application", null, [], rect(0, 0, 800, 20)),
      new ControlInfo("3.1", null, NOTES, ControlRole.Edit, "Text", "Dear team,", [ControlState.Focused], rect(0, 20, 800, 500)),
      new ControlInfo("3.2", null, NOTES, ControlRole.Edit, "Password", null, [ControlState.Password], rect(0, 520, 300, 24)),
      new ControlInfo("3.3", null, AppIdentity.ofMacBundleId("com.example.view"), ControlRole.Other, "Strange", null, [], rect(0, 544, 10, 10)),
      new ControlInfo("3.4", "3.0", NOTES, ControlRole.MenuItem, "File", null, [ControlState.Collapsed], rect(10, 0, 40, 20)),
      new ControlInfo("3.5", "3.1", NOTES, ControlRole.CheckBox, "Wrap", null, [ControlState.Disabled, ControlState.Checked], rect(0, 20, 10, 10)),
      new ControlInfo("3.6", "3.1", NOTES, ControlRole.CheckBox, "Some", null, [ControlState.Mixed], rect(0, 30, 10, 10)),
      new ControlInfo("3.7", "3.1", NOTES, ControlRole.Tab, "Tab", null, [ControlState.Selected], rect(0, 40, 10, 10)),
      new ControlInfo("3.8", "3.1", NOTES, ControlRole.TreeItem, "Open", null, [ControlState.Expanded], rect(0, 50, 10, 10)),
      new ControlInfo("3.9", "3.3", NOTES, ControlRole.Button, "Far", null, [], null)
    ], 4, true));
    assert.deepEqual(channel.named("readControls"), [{ target: TARGET_JSON, underHandle: null, timeoutMs: 2000 }]);
    assert.deepEqual(channel.named("continueControls"), [{ read: 3 }]);
  });

  it("reads the controls under one by its handle", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("readControls", { read: 4, controls: [], leftOut: 0, timedOut: false, isDone: true });

    assert.deepEqual(await backend.controls.readControlsAsync(TARGET, "3.4", HangGuard.signal()), new ControlTree([], 0, false));
    assert.deepEqual(channel.named("readControls"), [{ target: TARGET_JSON, underHandle: "3.4", timeoutMs: 2000 }]);
  });

  it("asks for no more slices once the call ends, failing with its reason", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const call = new AbortController();
    const reason = new Error("The call ended.");
    channel.answers.setBy("readControls", () => {
      call.abort(reason);

      return { read: 3, controls: [], leftOut: 0, timedOut: false, isDone: false };
    });

    await assert.rejects(backend.controls.readControlsAsync(TARGET, null, call.signal), reason);
    assert.deepEqual(channel.named("continueControls"), []);
  });

  it("finds a control again at the centre of its frame, or none", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const spots = [
      { role: "AXButton", subrole: "", name: "Save", isEnabled: true, x: 5, y: 6, width: 11, height: 4 },
      { role: "AXTextField", subrole: "AXSecureTextField", name: "", isEnabled: false, x: 1, y: 2, width: 0, height: 0 },
      null
    ];
    channel.answers.setBy("findControl", () => spots.shift());
    const signal = HangGuard.signal();

    const found = [
      await backend.controls.findControlAsync(TARGET, "3.1", signal),
      await backend.controls.findControlAsync(TARGET, "3.2", signal),
      await backend.controls.findControlAsync(TARGET, "3.3", signal)
    ];

    assert.deepEqual(found, [
      new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(10, 8)),
      new ControlSpot(ControlRole.Edit, "", false, false, new DesktopPoint(1, 2)),
      null
    ]);
    assert.deepEqual(channel.named("findControl"), [{ handle: "3.1" }, { handle: "3.2" }, { handle: "3.3" }]);
  });

  it("tells whether the control at a point is the control or one under it, within a second", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const hits = [true, false];
    channel.answers.setBy("hitsControl", () => hits.shift());
    const signal = HangGuard.signal();

    const hit = await backend.controls.isControlAtAsync(TARGET, "3.1", new DesktopPoint(3, 4), signal);
    const missed = await backend.controls.isControlAtAsync(TARGET, "3.1", new DesktopPoint(5, 6), signal);

    assert.deepEqual([hit, missed], [true, false]);
    assert.deepEqual(channel.named("hitsControl"), [{ handle: "3.1", x: 3, y: 4, timeoutMs: 1000 }, { handle: "3.1", x: 5, y: 6, timeoutMs: 1000 }]);
  });

  it("asks the input process nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();

    await assert.rejects(backend.controls.readControlsAsync(TARGET, "7", AbortSignal.abort()), { name: "AbortError" });
    await assert.rejects(backend.controls.findControlAsync(TARGET, "7", AbortSignal.abort()), { name: "AbortError" });
    await assert.rejects(backend.controls.isControlAtAsync(TARGET, "7", new DesktopPoint(1, 2), AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
  });

  it("fails a search with the call's reason when the call ends while the input process answers it", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const reason = new Error("The call ended.");
    for (const method of ["findControl", "hitsControl"]) {
      const call = new AbortController();
      channel.answers.setBy(method, () => {
        call.abort(reason);

        return method === "findControl" ? null : true;
      });

      await assert.rejects(method === "findControl" ? backend.controls.findControlAsync(TARGET, "3.1", call.signal)
        : backend.controls.isControlAtAsync(TARGET, "3.1", new DesktopPoint(1, 2), call.signal), reason);
    }
  });
});
