/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ToolFailureCode } from "@noldova/desktop.runtime";

import { KeyCalls } from "../services/key-calls.fixture.ts";
import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("a key chord", () => {
  it("reads keys in any case, with common names, spaces and modifiers in any order, and names them in one order", async () => {
    const harness = await KeyCalls.grantedAsync();
    const cases = [
      ["shift+ctrl+s", "Control+Shift+S"],
      ["Esc", "Escape"],
      ["return", "Enter"],
      ["Option+7", "Alt+Digit7"],
      [" Ctrl + pagedown ", "Control+PageDown"],
      ["Alt+ArrowUp", "Alt+Up"],
      ["arrowleft", "Left"],
      ["F12", "F12"]
    ] as const;

    for (const [keys, named] of cases) {
      await harness.callAsync("computer_key", KeyCalls.pressing(keys));

      assert.deepEqual(harness.center.records().at(-1)?.details[1], { name: "keys", value: named });
    }
    assert.deepEqual(KeyCalls.pressed(harness), cases.map(t => t[1]));
  });

  it("refuses the app's own shortcuts, in either reading of Mod and by the base's names of the arrow keys, before raising anything", async () => {
    const harness = await KeyCalls.grantedAsync(undefined, ["Mod+Shift+K", "Ctrl+Alt+1", "Mod+Comma", "Alt+F4", "Mod+W", "Mod+ArrowUp", "Mod+Alt+ArrowDown"]);
    const asked = harness.center.records().length;

    for (const keys of ["Control+Shift+K", "Shift+Meta+K", "Control+Alt+1", "Alt+F4", "Control+W", "Meta+W", "Control+Up", "Control+Alt+Down"])
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing(keys)), ToolFailureCode.Refused, /one of the app's own shortcuts/);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);

    await harness.callAsync("computer_key", KeyCalls.pressing("Control+K"));
    assert.deepEqual(KeyCalls.pressed(harness), ["Control+K"]);
  });

  it("never sends Mod+Shift+Period, the app's shortcut that stops control, in either reading of Mod", async () => {
    const harness = await KeyCalls.grantedAsync();
    const asked = harness.center.records().length;

    for (const keys of ["Control+Shift+Period", "Shift+Meta+Period"])
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing(keys)), ToolFailureCode.Refused);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });
});
