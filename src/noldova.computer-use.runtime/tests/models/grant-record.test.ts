/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionOption } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("the grant record", () => {
  it("forgets a session's grants when the session ends, for the next session of the same conversation", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.endSession(RuntimeHarness.sessionId);
    const next = harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    assert.deepEqual((await next).structured, RuntimeHarness.listingOf([]));
  });

  it("frees the screen for another conversation when the session ends", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.endSession(RuntimeHarness.sessionId);
    const other = harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    assert.deepEqual((await other).structured, RuntimeHarness.listingOf([]));
  });
});
