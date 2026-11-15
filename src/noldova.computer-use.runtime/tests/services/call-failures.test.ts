/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RefusalReason } from "@noldova/computer-use.runtime";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { TypeCalls } from "./type-calls.fixture.ts";

describe("the call failures", () => {
  it("maps every refusal the backend gives before sending, and fails as uncertain for any after sending", async () => {
    const before = new Map<RefusalReason, ToolFailureCode>([
      [RefusalReason.NotForeground, ToolFailureCode.Stale],
      [RefusalReason.OtherWindowAtPoint, ToolFailureCode.Stale],
      [RefusalReason.ForegroundChanged, ToolFailureCode.Stale],
      [RefusalReason.OutsideDisplays, ToolFailureCode.Stale],
      [RefusalReason.ControlChanged, ToolFailureCode.Stale],
      [RefusalReason.FocusOutsideTarget, ToolFailureCode.Stale],
      [RefusalReason.PhysicalInput, ToolFailureCode.Stopped],
      [RefusalReason.ElevatedTarget, ToolFailureCode.Refused],
      [RefusalReason.TargetRightsUnknown, ToolFailureCode.Refused],
      [RefusalReason.SecureInput, ToolFailureCode.Refused],
      [RefusalReason.PasswordField, ToolFailureCode.Refused],
      [RefusalReason.FocusUnknown, ToolFailureCode.Refused],
      [RefusalReason.MissingGrant, ToolFailureCode.Refused],
      [RefusalReason.DesktopOnlyCapture, ToolFailureCode.Refused]
    ]);
    assert.deepEqual([...before.keys()].map(t => t.value).sort(), RefusalReason.all.map(t => t.value).sort());
    const harness = await TypeCalls.grantedAsync();

    for (const [reason, code] of before) {
      harness.input.refusalBeforeSending = reason;

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", TypeCalls.typing("a")), code);
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.OutcomeUncertain);
    }
    harness.input.refusalBeforeSending = null;
    for (const reason of RefusalReason.all) {
      harness.input.refusalAfterSending = reason;

      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.OutcomeUncertain, /computer_screenshot/);
    }
  });

  it("refuses a window whose rights couldn't be read, saying so, before sending", async () => {
    const harness = await TypeCalls.grantedAsync();
    harness.input.refusalBeforeSending = RefusalReason.TargetRightsUnknown;

    await RuntimeHarness.assertFailsAsync(
      harness.callDirectlyAsync("computer_type", TypeCalls.typing("a")),
      ToolFailureCode.Refused,
      /^The input was refused: the target window's rights couldn't be read, so it may run with higher rights than the module\.$/
    );
    assert.deepEqual(harness.input.sent, []);
  });
});
