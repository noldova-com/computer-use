/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionDecision, PermissionDetailKind, PermissionOption, ToolAbortReason, ToolFailureCode, ToolRisk } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("the session grant", () => {
  it("asks once per conversation, at the high risk level, to see and control the screen", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    const pending = await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await first;
    await harness.callAsync("computer_list_displays", {});

    assert.equal(pending.request.subject, "screen");
    assert.equal(pending.scope, RuntimeHarness.scope);
    assert.equal(pending.session, RuntimeHarness.sessionId);
    assert.equal(pending.request.risk, ToolRisk.High);
    assert.deepEqual(pending.request.options, [PermissionOption.AllowOnce, PermissionOption.AllowAlways, PermissionOption.Deny]);
    assert.deepEqual(pending.request.details.map(t => [t.label, t.value, t.kind]), [
      ["tool", "computer_list_apps", PermissionDetailKind.Text],
      ["arguments", "{}", PermissionDetailKind.Code]
    ]);
    assert.equal(harness.answerer.delivered().length, 1);
  });

  it("asks the conversation's next session again after Allow once, and remembers nothing", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await first;
    harness.endSession();
    const next = harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");
    const pending = await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await next;

    assert.equal(pending.session, "session-2");
    assert.deepEqual(harness.center.remembered(), []);
    assert.equal(harness.answerer.delivered().length, 2);
  });

  it("starts the conversation's next session from Allow in this chat without asking, and only that conversation's", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowAlways);
    await first;
    harness.endSession();
    await harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");

    assert.deepEqual(harness.center.remembered().map(t => [t.action, t.subject, t.scope, t.decision]), [["computer-use.controlScreen", "screen", RuntimeHarness.scope, PermissionDecision.AllowedAlways]]);
    assert.deepEqual(harness.center.records().filter(t => t.action === "computer-use.controlScreen").map(t => [t.decision, t.isRemembered]), [
      [PermissionDecision.AllowedAlways, false],
      [PermissionDecision.AllowedAlways, true]
    ]);
    assert.equal(harness.answerer.delivered().length, 1);
  });

  it("asks a new conversation again after Allow in this chat in another", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowAlways);
    await first;
    harness.endSession();
    const other = harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2");
    const pending = await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
    await RuntimeHarness.assertFailsAsync(other, ToolFailureCode.Denied);

    assert.equal(pending.scope, "conversation-2");
    assert.equal(harness.answerer.delivered().length, 2);
  });

  it("asks the conversation's next session again once its Allow in this chat is revoked, leaving the session that holds the screen", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowAlways);
    await first;
    const [answer] = harness.center.remembered();
    assert.ok(answer);
    harness.center.forget(answer);
    await harness.callAsync("computer_list_displays", {});
    harness.endSession();
    const next = harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await next;

    assert.equal(harness.answerer.delivered().length, 2);
  });

  it("asks a second session of the conversation while the first holds the screen after Allow once, and keeps the screen after its Deny", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await first;
    const second = harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");
    const pending = await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
    await RuntimeHarness.assertFailsAsync(second, ToolFailureCode.Denied);
    await harness.callAsync("computer_list_displays", {});
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-3"), ToolFailureCode.Unavailable, /Another conversation controls the screen/);

    assert.equal(pending.session, "session-2");
    assert.equal(harness.answerer.delivered().length, 2);
  });

  it("asks a second session of the conversation while the first holds the screen once its Allow in this chat is revoked", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowAlways);
    await first;
    const [answer] = harness.center.remembered();
    assert.ok(answer);
    harness.center.forget(answer);
    const second = harness.callAsync("computer_list_apps", {}, undefined, RuntimeHarness.scope, "session-2");
    const pending = await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await second;

    assert.equal(pending.session, "session-2");
    assert.equal(harness.answerer.delivered().length, 2);
  });

  it("shows the call's arguments cut to 12,000 characters, inside the base's limit for a request's details", async () => {
    const harness = await RuntimeHarness.startAsync();
    const input = { text: "x", summary: "\u{1F600}".repeat(12_000) };

    const call = harness.callAsync("computer_type", input);
    const pending = await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Denied);

    assert.equal(pending.request.details[1]?.value, `${Array.from(JSON.stringify(input)).slice(0, 12_000).join("")}…`);
  });

  it("fails as denied, reaching nothing, and asks again on the next call", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Denied, /didn't allow this conversation/);
    const again = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await again;

    assert.equal(harness.apps.signals.length, 1);
  });

  it("fails as expired when nobody answers", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerer.nextAsync();
    t.mock.timers.tick(RuntimeHarness.defaultExpiryMilliseconds);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Expired, /expired without an answer/);
    assert.deepEqual(harness.apps.signals, []);
  });

  it("fails as withdrawn when the host withdraws the request while the call goes on", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerer.nextAsync();
    harness.center.withdrawAll();

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Withdrawn, /was withdrawn/);
  });

  it("fails by the kind of the call's end while the request waits", async () => {
    const cases = [
      [ToolAbortReason.Cancelled, ToolFailureCode.Withdrawn],
      [ToolAbortReason.SessionEnded, ToolFailureCode.Withdrawn],
      [ToolAbortReason.Stopped, ToolFailureCode.Stopped],
      [ToolAbortReason.DeadlineReached, ToolFailureCode.TimedOut]
    ] as const;

    for (const [reason, code] of cases) {
      const harness = await RuntimeHarness.startAsync();
      const controller = new AbortController();

      const call = harness.callDirectlyAsync("computer_list_apps", {}, controller.signal);
      await harness.answerer.nextAsync();
      controller.abort(reason);

      await RuntimeHarness.assertFailsAsync(call, code);
    }
  });

  it("frees the screen when its session ends while the request waits", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerer.nextAsync();
    harness.endSession(RuntimeHarness.sessionId);
    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Withdrawn);
    const other = harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await other;
  });

  it("fails as busy, in its turn, another conversation's call that arrived before the first claimed the screen", async () => {
    const harness = await RuntimeHarness.startAsync();

    const first = harness.callAsync("computer_list_apps", {});
    const second = harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await first;
    await RuntimeHarness.assertFailsAsync(second, ToolFailureCode.Unavailable, /Another conversation controls the screen/);
    assert.equal(harness.answerer.delivered().length, 1);
  });
});
