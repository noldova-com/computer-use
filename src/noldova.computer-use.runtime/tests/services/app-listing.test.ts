/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AppInfo } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("the app listing", () => {
  it("passes on a failure of the list that isn't the backend's own as it is", async () => {
    const harness = await RuntimeHarness.startAsync();
    const defect = new TypeError("A defect in the module.");
    harness.apps.failure = defect;

    const call = harness.callDirectlyAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await assert.rejects(call, (error: unknown) => error === defect);
  });

  it("fails as unavailable, keeping the addon's failure as its cause, when the Windows addon refuses a list past its limit of program paths", async () => {
    const harness = await RuntimeHarness.startAsync();
    const failure = Object.assign(new RangeError("The running or the installed apps have more than 1,024 program paths, so the list would be incomplete."), { code: "ERR_WINDOWS_DESKTOP" });
    harness.apps.failure = failure;

    const call = harness.callDirectlyAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await assert.rejects(call, (error: unknown) => error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.cause === failure);
  });

  it("fails by the call's end when the backend gives up on an ended call", async () => {
    const harness = await RuntimeHarness.startAsync();
    const controller = new AbortController();
    harness.apps.failure = new Error("Listing stopped.");

    const call = harness.callDirectlyAsync("computer_list_apps", {}, controller.signal);
    const pending = await harness.answerer.nextAsync();
    harness.apps.listAppsAsync = async t => {
      controller.abort(ToolAbortReason.Stopped);
      t.throwIfAborted();

      return [];
    };
    harness.answerer.answer(pending.id, PermissionOption.AllowOnce);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Stopped);
  });

  it("fails by the call's end when the call ends while the backend lists", async () => {
    const harness = await RuntimeHarness.startAsync();
    const controller = new AbortController();
    const apps: readonly AppInfo[] = [RuntimeHarness.notes];

    const call = harness.callDirectlyAsync("computer_list_apps", {}, controller.signal);
    const pending = await harness.answerer.nextAsync();
    harness.apps.listAppsAsync = async () => {
      controller.abort(ToolAbortReason.DeadlineReached);

      return apps;
    };
    harness.answerer.answer(pending.id, PermissionOption.AllowOnce);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.TimedOut);
  });
});
