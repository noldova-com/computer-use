/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject, JsonValue } from "@noldova/computer-use.protocol";
import { DesktopPoint, DesktopRect, ModifierKey, PointerButton, WindowInfo } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("computer_drag", () => {
  const summary = "Moves the card to the next column.";

  function dragging(from: readonly [number, number], to: readonly [number, number], more: Record<string, JsonValue> = {}): JsonObject {
    return { from: [...from], to: [...to], ...more, summary };
  }

  async function shotAsync(scale: number = 1): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", { scale });

    return harness;
  }

  it("drags between the desktop points under the screenshot's pixels, raising a request with both ends", async () => {
    const harness = await shotAsync(0.5);

    const result = await harness.callAsync("computer_drag", dragging([0, 0], [3, 2]));
    await harness.callAsync("computer_drag", dragging([1, 1], [2, 1], { button: "right", modifiers: "Shift" }));

    assert.deepEqual(result.structured, { dragged: [[0, 0], [3, 2]] });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.points, t.button, t.modifiers]), [
      ["drag", [new DesktopPoint(1, 1), new DesktopPoint(7, 5)], PointerButton.Left, []],
      ["drag", [new DesktopPoint(3, 3), new DesktopPoint(5, 3)], PointerButton.Right, [ModifierKey.Shift]]
    ]);
    const record = harness.center.records().at(-1);
    assert.equal(record?.action, "computer-use.controlApp");
    assert.deepEqual(record?.details, [
      { name: "input", value: "drag" },
      { name: "from", value: "1, 1" },
      { name: "to", value: "2, 1" },
      { name: "button", value: "Right" },
      { name: "modifiers", value: "Shift" },
      { name: "app", value: "Notes" },
      { name: "identity", value: RuntimeHarness.notes.identity.id },
      { name: "summary", value: summary }
    ]);
  });

  it("refuses either end another app's window covers, naming the app, and fails as stale when the backend's check finds an end covered", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;
    harness.windows.foreground = new WindowInfo(RuntimeHarness.notes.identity, "Notes", "100", 42, new DesktopRect(0, 0, 4, 6), false);
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.terminal.identity, new DesktopRect(4, 0, 4, 6)], [RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"])];

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_drag", dragging([1, 1], [6, 1])), ToolFailureCode.Refused, /^A point of the call lies over a window of C:\\Windows\\System32\\cmd\.exe, which covers Notes there\. Nothing was sent\./);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_drag", dragging([6, 1], [1, 1])), ToolFailureCode.Refused, /^A point of the call lies over a window of C:\\Windows\\System32\\cmd\.exe, which covers Notes there\. Nothing was sent\./);
    assert.equal(harness.center.records().length, asked);

    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"])];
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_drag", dragging([1, 1], [6, 1])), ToolFailureCode.Stale, /another window lies under the point/);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses an end outside the latest screenshot before raising anything", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;

    for (const [from, to] of [[[0, 0], [8, 0]], [[0, 6], [0, 0]]] as const)
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_drag", dragging(from, to)), ToolFailureCode.Refused, /^The point must be inside the latest full screenshot/);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses a drag in a click-only app without raising a request", async () => {
    const harness = await shotAsync();
    await harness.grantAppAsync(RuntimeHarness.terminal);
    harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.terminal);
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_drag", dragging([0, 0], [1, 1])), ToolFailureCode.Refused, /^Command Prompt is granted at the ClickOnly tier, which doesn't allow drag\./);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  const refused: readonly JsonObject[] = [{ from: null, to: [1, 1], summary }, { from: [0, 0], summary }, { from: [0, 0], to: [1, 1] }, { from: [0], to: [1, 1], summary },
    { from: [0, 0, 0], to: [1, 1], summary }, { from: [0, 0.5], to: [1, 1], summary }, { from: true, to: [1, 1], summary },
    dragging([0, 0], [1, 1], { button: "back" }), dragging([0, 0], [1, 1], { modifiers: "Shift+Hyper" }), dragging([0, 0], [1, 1], { count: 2 })];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)} before raising anything`, async () => {
      const harness = await shotAsync();
      const asked = harness.center.records().length;

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_drag", input), ToolFailureCode.Refused, /^computer_drag takes to, and optionally from,/);
      assert.equal(harness.center.records().length, asked);
    });
});
