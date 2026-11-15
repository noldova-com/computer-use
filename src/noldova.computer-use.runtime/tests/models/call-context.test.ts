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

describe("a call's context", () => {
  it("asks through the base's call, in the call's own conversation and session", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2");
    const pending = await harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce);
    await call;

    assert.deepEqual([pending.scope, pending.session], ["conversation-2", "session-2"]);
  });
});
