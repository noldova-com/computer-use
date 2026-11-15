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

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { TypeCalls } from "../services/type-calls.fixture.ts";

describe("the kinds of a call's end", () => {
  it("fails by the kind of the call's end before any input", async () => {
    const cases: readonly (readonly [string, ToolFailureCode])[] = [
      [ToolAbortReason.Stopped, ToolFailureCode.Stopped],
      [ToolAbortReason.Cancelled, ToolFailureCode.Cancelled],
      [ToolAbortReason.SessionEnded, ToolFailureCode.Cancelled],
      [ToolAbortReason.SwitchedOff, ToolFailureCode.Unavailable],
      [ToolAbortReason.DeadlineReached, ToolFailureCode.TimedOut],
      ["Unknown", ToolFailureCode.Cancelled]
    ];
    const harness = await TypeCalls.grantedAsync();
    const window = harness.windows.foreground;

    for (const [reason, code] of cases) {
      const controller = new AbortController();
      harness.windows.getForegroundWindowAsync = async () => {
        controller.abort(reason);

        return window;
      };

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", TypeCalls.typing("a"), controller.signal), code);
    }
    assert.deepEqual(harness.input.sent, []);
  });
});
