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

  it("keeps an app for the conversation's earlier session when a later session that also asked for it ends, and forgets it once both have ended", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const asked = harness.callAsync("computer_request_apps", { apps: [RuntimeHarness.notes.identity.id], reason: "To write the note." }, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await asked;

    harness.endSession("session-2");
    const kept = await harness.callAsync("computer_list_apps", {});
    harness.endSession(RuntimeHarness.sessionId);
    const next = harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-3");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    assert.deepEqual(kept.structured, RuntimeHarness.listingOf([RuntimeHarness.notes]));
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
