/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect } from "@noldova/computer-use.runtime";
import type { IWindowsControlJson } from "@noldova/computer-use.runtime/windows";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

describe("the controls' bounds", () => {
  function control(handle: string, parentHandle: string | null, x: number, y: number, width: number, height: number): IWindowsControlJson {
    return {
      handle, parentHandle, processId: 42, imagePath: WindowsBackendHarness.notesPath, controlType: 50033, name: handle, value: null, isEnabled: true, hasFocus: false,
      isPassword: false, isReadOnly: false, isSelected: false, toggleState: -1, expandState: -1, x, y, width, height
    };
  }

  it("cuts each control to the visible part of the one it lies in, and gives none to a control outside it, under one with none, or without area", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.controlTree = {
      controls: [
        control("1.1", null, 0, 0, 100, 50),
        control("1.2", "1.1", 80, 40, 40, 20),
        control("1.3", "1.1", 200, 0, 10, 10),
        control("1.4", "1.3", 200, 0, 5, 5),
        control("1.5", "1.2", 90, 45, 20, 20),
        control("1.6", null, 0, 0, 0, 10)
      ],
      leftOut: 0,
      timedOut: false
    };

    const tree = await backend.controls.readControlsAsync(WindowsBackendHarness.target, null, HangGuard.signal());

    assert.deepEqual(tree.controls.map(t => [t.handle, t.bounds]), [
      ["1.1", new DesktopRect(0, 0, 100, 50)],
      ["1.2", new DesktopRect(80, 40, 20, 10)],
      ["1.3", null],
      ["1.4", null],
      ["1.5", new DesktopRect(90, 45, 10, 5)],
      ["1.6", null]
    ]);
  });
});
