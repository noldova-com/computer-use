/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionOption, ToolAbortReason, ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("the action queue", () => {
  it("runs a conversation's calls one at a time, in the order they came", async () => {
    const harness = await RuntimeHarness.startAsync();
    const order: string[] = [];

    const first = harness.callAsync("computer_list_apps", {}).then(() => order.push("first"));
    const second = harness.callAsync("computer_list_displays", {}).then(() => order.push("second"));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await Promise.all([first, second]);

    assert.deepEqual(order, ["first", "second"]);
    assert.equal(harness.answerer.delivered().length, 1);
  });

  it("fails a call that ends while it waits for its turn by the kind of its end, without running it", async () => {
    const harness = await RuntimeHarness.startAsync();
    const controller = new AbortController();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerer.nextAsync();
    const second = harness.callDirectlyAsync("computer_list_apps", {}, controller.signal);
    controller.abort(ToolAbortReason.Stopped);
    await RuntimeHarness.assertFailsAsync(second, ToolFailureCode.Stopped, /stopped control before any input/);
    harness.center.withdrawAll();
    await RuntimeHarness.assertFailsAsync(first, ToolFailureCode.Withdrawn, /was withdrawn/);

    assert.deepEqual(harness.apps.signals, []);
  });

  it("fails a call that ended before it began, without asking", async () => {
    const harness = await RuntimeHarness.startAsync();

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_list_apps", {}, AbortSignal.abort(ToolAbortReason.DeadlineReached)), ToolFailureCode.TimedOut);
    assert.deepEqual(harness.answerer.delivered(), []);
  });

  it("runs the next call after one fails", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
    await RuntimeHarness.assertFailsAsync(first, ToolFailureCode.Denied);
    const second = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await second;
  });
});
