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
import { PermissionDecision, PermissionDetailKind, PermissionOption, ToolAbortReason, ToolFailureCode, ToolRisk } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("computer_request_apps", () => {
  const reason = "To write the note.";

  function request(...apps: string[]): JsonObject {
    return { apps, reason };
  }

  it("raises one control_app request per app, with the app as its subject and what the person needs to decide", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_request_apps", request(RuntimeHarness.notes.identity.id));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    const pending = await harness.answerAsync("computer-use.controlApp", PermissionOption.AllowAlways);

    assert.equal(pending.request.subject, RuntimeHarness.notes.identity.id);
    assert.equal(pending.scope, RuntimeHarness.scope);
    assert.equal(pending.session, RuntimeHarness.sessionId);
    assert.equal(pending.request.risk, ToolRisk.Medium);
    assert.deepEqual(pending.request.options, [PermissionOption.AllowAlways, PermissionOption.Deny]);
    assert.deepEqual(pending.request.details.map(t => [t.label, t.value, t.kind]), [
      ["app", "Notes", PermissionDetailKind.Text],
      ["identity", RuntimeHarness.notes.identity.id, PermissionDetailKind.Text],
      ["publisher", "Example Ltd", PermissionDetailKind.Text],
      ["tier", "Full", PermissionDetailKind.Text],
      ["reason", reason, PermissionDetailKind.AgentText]
    ]);
    assert.deepEqual((await call).structured, { apps: [{ identity: RuntimeHarness.notes.identity.id, outcome: "Granted", isGranted: true, tier: "Full" }] });
  });

  it("says an app's request expired when nobody answers it", async () => {
    const harness = await RuntimeHarness.startAsync(undefined, undefined, t => t.action === RuntimeHarness.controlApp ? Promise.resolve(PermissionDecision.Expired) : null);

    const call = harness.callAsync("computer_request_apps", request(RuntimeHarness.notes.identity.id));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    assert.deepEqual((await call).structured, { apps: [{ identity: RuntimeHarness.notes.identity.id, outcome: "Expired", isGranted: false, tier: null }] });
  });

  it("says an app's request was withdrawn when the host withdraws it while the call goes on", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_request_apps", request(RuntimeHarness.notes.identity.id));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await harness.answerer.nextAsync();
    harness.center.withdrawAll();

    assert.deepEqual((await call).structured, { apps: [{ identity: RuntimeHarness.notes.identity.id, outcome: "Withdrawn", isGranted: false, tier: null }] });
  });

  it("fails as withdrawn when the caller cancels while an app's request waits, and as stopped when the person stops", async () => {
    for (const [abortReason, code] of [[ToolAbortReason.Cancelled, ToolFailureCode.Withdrawn], [ToolAbortReason.Stopped, ToolFailureCode.Stopped]] as const) {
      const harness = await RuntimeHarness.startAsync();
      const controller = new AbortController();

      const call = harness.callDirectlyAsync("computer_request_apps", request(RuntimeHarness.notes.identity.id), controller.signal);
      await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
      await harness.answerer.nextAsync();
      controller.abort(abortReason);

      await RuntimeHarness.assertFailsAsync(call, code);
    }
  });

  it("refuses input that isn't a list of distinct identities and a reason", async () => {
    const harness = await RuntimeHarness.startAsync();
    const first = harness.callDirectlyAsync("computer_request_apps", { apps: "Notes", reason });
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await RuntimeHarness.assertFailsAsync(first, ToolFailureCode.Refused, /takes apps/);

    for (const input of [
      { apps: [], reason },
      { apps: [""], reason },
      { apps: [1], reason },
      { apps: ["a", "a"], reason },
      { apps: ["a"] },
      { apps: ["a"], reason: " " }
    ])
      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_request_apps", input), ToolFailureCode.Refused, /takes apps/);
  });

  it("fails as unavailable when the backend can't list the apps", async () => {
    const harness = await RuntimeHarness.startAsync();
    harness.apps.failure = new BackendFailureException("listApps");

    const call = harness.callAsync("computer_request_apps", request(RuntimeHarness.notes.identity.id));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Unavailable, /could not be listed to request them/);
  });
});
