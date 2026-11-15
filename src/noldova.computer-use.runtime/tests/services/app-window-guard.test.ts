/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppWindow } from "@noldova/desktop.protocol";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { KeyCalls } from "./key-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { TypeCalls } from "./type-calls.fixture.ts";

describe("the app's own windows", () => {
  const refusal = /^The window in front is one of the app's own windows, which computer use leaves alone\. Nothing was sent or read\.$/;

  it("refuses a press while one of the app's windows is in front, before raising anything", async () => {
    const harness = await KeyCalls.grantedAsync();
    harness.context.listedWindows = [new AppWindow(7, 42)];
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Enter")), ToolFailureCode.Refused, refusal);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses typing while one of the app's windows is in front, and types once the window in front is another app's again", async () => {
    const harness = await TypeCalls.grantedAsync();
    const listed: AppWindow[] = [new AppWindow(null, 42)];
    harness.context.appWindows.answer("list", () => listed);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.Refused, refusal);
    listed.length = 0;
    harness.context.appWindows.raiseChanged();
    await harness.callAsync("computer_type", TypeCalls.typing("a"));

    assert.deepEqual(harness.input.sent.map(t => t.text), ["a"]);
  });

  it("sends to the window in front when the app's windows belong to another process", async () => {
    const harness = await KeyCalls.grantedAsync();
    harness.context.appWindows.answer("list", () => [new AppWindow(7, 43)]);

    await harness.callAsync("computer_key", KeyCalls.pressing("Enter"));

    assert.deepEqual(KeyCalls.pressed(harness), ["Enter"]);
  });
});
