/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolFailureCode } from "@noldova/desktop.runtime";

import { KeyCalls } from "../services/key-calls.fixture.ts";
import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { ScreenImages } from "../services/screen-images.fixture.ts";

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

  it("gives each session of a conversation only the apps it asked for, in its screenshots, reads, inputs and app list, and answers its own ask for another's app from Allow always", async () => {
    const harness = await ScreenImages.startAsync();
    await harness.grantAppAsync(RuntimeHarness.files, RuntimeHarness.scope, "session-2");
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(0, 0, 4, 6)], [RuntimeHarness.files.identity, new DesktopRect(4, 0, 4, 6)])];
    const first = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));
    const second = ScreenImages.read(await harness.callAsync("computer_screenshot", {}, undefined, RuntimeHarness.scope, "session-2"));
    harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.files);
    const read = harness.callAsync("computer_read_window", {});
    await RuntimeHarness.assertFailsAsync(read, ToolFailureCode.Refused, /^File Explorer isn't granted to this session\./);
    const key = harness.callAsync("computer_key", KeyCalls.pressing("Enter"));
    await RuntimeHarness.assertFailsAsync(key, ToolFailureCode.Refused, /^File Explorer isn't granted to this session\./);
    const listed = [(await harness.callAsync("computer_list_apps", {})).structured, (await harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2")).structured];
    const asked = harness.answerer.delivered().length;
    await harness.callAsync("computer_request_apps", { apps: [RuntimeHarness.notes.identity.id], reason: "To write the note." }, undefined, RuntimeHarness.scope, "session-2");

    assert.deepEqual(first.image.rows(), ScreenImages.expectedRows(8, 6, x => x < 4));
    assert.deepEqual(second.image.rows(), ScreenImages.expectedRows(8, 6, x => x >= 4));
    assert.deepEqual(harness.input.sent, []);
    assert.deepEqual(listed, [RuntimeHarness.listingOf([RuntimeHarness.notes]), RuntimeHarness.listingOf([RuntimeHarness.files])]);
    assert.equal(harness.answerer.delivered().length, asked);
    assert.deepEqual((await harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2")).structured, RuntimeHarness.listingOf([RuntimeHarness.notes, RuntimeHarness.files]));
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
