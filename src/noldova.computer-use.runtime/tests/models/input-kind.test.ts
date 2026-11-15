/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ToolAbortReason, ToolFailureCode } from "@noldova/desktop.runtime";

import { KeyCalls } from "../services/key-calls.fixture.ts";
import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("an input's kind", () => {
  it("fails as uncertain, naming the kind, when the call ends between repeats or after the last", async () => {
    for (const repeat of [3, 1]) {
      const harness = await KeyCalls.grantedAsync();
      const controller = new AbortController();
      KeyCalls.afterEachPress(harness, () => controller.abort(ToolAbortReason.Stopped));

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_key", KeyCalls.pressing("Tab", repeat), controller.signal), ToolFailureCode.OutcomeUncertain, /The call ended \(Stopped\)/);
      assert.deepEqual(KeyCalls.pressed(harness), ["Tab"]);
    }
  });
});
