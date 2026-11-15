/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionOption, ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("the screen hold", () => {
  it("keeps the screen for the conversation until the last of its granted sessions ends", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowAlways);
    await first;
    await harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");
    harness.endSession();
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-3"), ToolFailureCode.Unavailable, /Another conversation controls the screen/);
    harness.endSession("session-2");
    const other = harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-4");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await other;

    assert.equal(harness.answerer.delivered().length, 2);
  });

  it("fails another conversation's call at once while one holds the screen, never queuing it", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerer.nextAsync();

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2"), ToolFailureCode.Unavailable, /Another conversation controls the screen/);
    harness.center.withdrawAll();
    await RuntimeHarness.assertFailsAsync(first, ToolFailureCode.Withdrawn, /was withdrawn/);
  });
});
