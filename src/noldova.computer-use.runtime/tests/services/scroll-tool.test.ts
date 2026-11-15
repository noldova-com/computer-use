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
import { DesktopPoint, DesktopRect, RefusalReason, ScrollAmount } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("computer_scroll", () => {
  const summary = "Shows the rest of the list.";

  function scrolling(direction: string, amount: number, x: number = 1, y: number = 2): JsonObject {
    return { x, y, direction, amount, summary };
  }

  async function shotAsync(scale: number = 1): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", { scale });

    return harness;
  }

  it("turns the wheel at the desktop point under the screenshot's pixel, each way, raising a request with its input", async () => {
    const harness = await shotAsync(0.5);

    const result = await harness.callAsync("computer_scroll", scrolling("down", 3));
    await harness.callAsync("computer_scroll", scrolling("up", 50));
    await harness.callAsync("computer_scroll", scrolling("left", 1));
    await harness.callAsync("computer_scroll", scrolling("right", 2));

    assert.deepEqual(result.structured, { scrolled: 3 });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.points, t.amount, t.modifiers]), [
      ["scroll", [new DesktopPoint(3, 5)], new ScrollAmount(0, 3), []],
      ["scroll", [new DesktopPoint(3, 5)], new ScrollAmount(0, -50), []],
      ["scroll", [new DesktopPoint(3, 5)], new ScrollAmount(-1, 0), []],
      ["scroll", [new DesktopPoint(3, 5)], new ScrollAmount(2, 0), []]
    ]);
    const record = harness.center.records().at(-4);
    assert.equal(record?.action, "computer-use.controlApp");
    assert.deepEqual(record?.details, [
      { name: "input", value: "scroll" },
      { name: "point", value: "1, 2" },
      { name: "direction", value: "down" },
      { name: "amount", value: "3" },
      { name: "app", value: "Notes" },
      { name: "identity", value: RuntimeHarness.notes.identity.id },
      { name: "summary", value: summary }
    ]);
  });

  it("scrolls in a click-only app", async () => {
    const harness = await shotAsync();
    await harness.grantAppAsync(RuntimeHarness.terminal);
    harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.terminal);

    await harness.callAsync("computer_scroll", scrolling("down", 1));

    assert.deepEqual(harness.input.sent.map(t => t.target), [RuntimeHarness.windowOf(RuntimeHarness.terminal).target]);
  });

  it("refuses a point another app's window covers, naming the app, before raising anything", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.terminal.identity, new DesktopRect(4, 0, 4, 6)], [RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"])];

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_scroll", scrolling("down", 1, 5, 1)), ToolFailureCode.Refused, /^A point of the call lies over a window of C:\\Windows\\System32\\cmd\.exe, which covers Notes there\. Nothing was sent\./);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses a point outside the latest screenshot, and fails as stale when the display changed after it, before raising anything", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_scroll", scrolling("down", 1, 8, 0)), ToolFailureCode.Refused, /^The point must be inside the latest full screenshot/);
    harness.backend.capture.refusal = RefusalReason.OutsideDisplays;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_scroll", scrolling("down", 1)), ToolFailureCode.Stale);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails as uncertain when the backend refuses after sending", async () => {
    const harness = await shotAsync();
    harness.input.refusalAfterSending = RefusalReason.PhysicalInput;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_scroll", scrolling("down", 1)), ToolFailureCode.OutcomeUncertain, /may already have been sent/);
  });

  const refused: readonly JsonObject[] = [{ x: 0, y: 0, direction: "down", summary }, { x: 0, y: 0, amount: 1, summary }, { x: 0, y: 0, direction: 1, amount: 1, summary }, scrolling("down", 0), scrolling("down", 51), scrolling("down", 1.5), scrolling("in", 1),
    { x: 0, y: 0, direction: "down", amount: 1 }, { ...scrolling("down", 1), modifiers: "Shift" }];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)} before raising anything`, async () => {
      const harness = await shotAsync();
      const asked = harness.center.records().length;

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_scroll", input), ToolFailureCode.Refused, /^computer_scroll takes x and y/);
      assert.equal(harness.center.records().length, asked);
    });
});
