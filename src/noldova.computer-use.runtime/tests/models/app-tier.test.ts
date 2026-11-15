/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ClickCount, PointerButton } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { ClickCalls } from "../services/click-calls.fixture.ts";
import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("an app's tier", () => {
  it("refuses a right click, a triple click and modifiers in a click-only app, and sends its left and middle clicks", async () => {
    const harness = await ClickCalls.shotAsync();
    await harness.grantAppAsync(RuntimeHarness.terminal);
    harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.terminal);
    const asked = harness.center.records().length;

    for (const more of [{ button: "right" }, { count: 3 }, { modifiers: "Shift" }] as const)
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0, more)), ToolFailureCode.Refused, /^Command Prompt is granted at the ClickOnly tier, which allows only left and middle clicks, single or double, without modifiers\. Nothing was sent\.$/);
    assert.equal(harness.center.records().length, asked);
    assert.equal(harness.input.sent.length, 0);

    await harness.callAsync("computer_click", ClickCalls.clicking(0, 0, { count: 2 }));
    await harness.callAsync("computer_click", ClickCalls.clicking(0, 0, { button: "middle" }));

    assert.deepEqual(harness.input.sent.map(t => [t.button, t.count]), [[PointerButton.Left, ClickCount.Double], [PointerButton.Middle, ClickCount.Single]]);
  });
});
