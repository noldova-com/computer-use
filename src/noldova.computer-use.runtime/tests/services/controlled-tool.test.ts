/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Display } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("a controlled tool", () => {
  it("ends a running call as switched off, with its own failure, when it deactivates", async () => {
    const harness = await RuntimeHarness.startAsync();
    const entered = Promise.withResolvers<void>();
    const listing = Promise.withResolvers<readonly Display[]>();
    const granted = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await granted;
    harness.backend.displays.listDisplaysAsync = async () => {
      entered.resolve();

      return await listing.promise;
    };
    const running = harness.callAsync("computer_list_displays", {});
    await entered.promise;

    await harness.part.deactivateAsync();
    listing.resolve([]);

    await RuntimeHarness.assertFailsAsync(running, ToolFailureCode.Unavailable, /^The computer-use module was switched off before any input was sent\.$/);
  });

  it("withdraws a call whose request waits when it deactivates", async () => {
    const harness = await RuntimeHarness.startAsync();

    const waiting = harness.callAsync("computer_list_displays", {});
    const pending = await harness.answerer.nextAsync();
    await harness.part.deactivateAsync();

    await RuntimeHarness.assertFailsAsync(waiting, ToolFailureCode.Withdrawn);
    assert.equal(pending.signal.aborted, true);
  });
});
