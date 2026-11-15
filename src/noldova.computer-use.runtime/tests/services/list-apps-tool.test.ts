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

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("computer_list_apps", () => {
  it("lists every app with the tier it can be granted at, marked untrusted", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    const result = await call;

    assert.deepEqual(result.structured, RuntimeHarness.listingOf([]));
  });

  it("refuses arguments, before asking through the registry and itself after", async () => {
    const harness = await RuntimeHarness.startAsync();

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_apps", { all: true }), ToolFailureCode.Refused);
    assert.deepEqual(harness.answerer.delivered(), []);
    const call = harness.callDirectlyAsync("computer_list_apps", { all: true });
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Refused, /takes no arguments/);
  });

  it("fails as unavailable when the backend fails", async () => {
    const harness = await RuntimeHarness.startAsync();
    harness.apps.failure = new BackendFailureException("listApps");

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Unavailable, /^The apps could not be listed\.$/);
  });
});
