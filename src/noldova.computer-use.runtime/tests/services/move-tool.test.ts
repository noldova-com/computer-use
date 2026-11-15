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
import { DesktopPoint, DesktopRect, RefusalReason } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("computer_move", () => {
  async function shotAsync(scale: number = 1): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", { scale });

    return harness;
  }

  it("moves the pointer to the desktop point under the screenshot's pixel, raising a request with its point and no summary", async () => {
    const harness = await shotAsync(0.5);

    const result = await harness.callAsync("computer_move", { x: 3, y: 0 });

    assert.deepEqual(result.structured, { moved: [3, 0] });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.points, t.target]), [["move", [new DesktopPoint(7, 1)], RuntimeHarness.windowOf(RuntimeHarness.notes).target]]);
    const record = harness.center.records().at(-1);
    assert.equal(record?.action, "computer-use.controlApp");
    assert.deepEqual(record?.details, [
      { name: "input", value: "move" },
      { name: "point", value: "3, 0" },
      { name: "app", value: "Notes" },
      { name: "identity", value: RuntimeHarness.notes.identity.id }
    ]);
  });

  it("refuses a move in a click-only app without raising a request", async () => {
    const harness = await shotAsync();
    await harness.grantAppAsync(RuntimeHarness.terminal);
    harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.terminal);
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_move", { x: 0, y: 0 }), ToolFailureCode.Refused, /^Command Prompt is granted at the ClickOnly tier, which doesn't allow move\./);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses a point another app's window covers, naming the app, before raising anything", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.terminal.identity, new DesktopRect(4, 0, 4, 6)], [RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"])];

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_move", { x: 5, y: 1 }), ToolFailureCode.Refused, /^A point of the call lies over a window of C:\\Windows\\System32\\cmd\.exe, which covers Notes there\. Nothing was sent\./);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses a point outside the latest screenshot before raising anything, and fails as stale when the backend's check does", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_move", { x: 0, y: 6 }), ToolFailureCode.Refused, /^The point must be inside the latest full screenshot/);
    assert.equal(harness.center.records().length, asked);
    harness.input.refusalBeforeSending = RefusalReason.NotForeground;
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_move", { x: 0, y: 0 }), ToolFailureCode.Stale);
    assert.deepEqual(harness.input.sent, []);
  });

  const refused: readonly JsonObject[] = [{}, { x: 0 }, { x: 0, y: -0.5 }, { x: 0, y: 0, summary: "Shows the tooltip." }];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)} before raising anything`, async () => {
      const harness = await shotAsync();

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_move", input), ToolFailureCode.Refused, /^computer_move takes x and y/);
    });
});
