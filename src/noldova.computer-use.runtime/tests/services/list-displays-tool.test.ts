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
import { PermissionOption, ToolAbortReason, ToolFailure, ToolFailureCode, ToolFailureException, ToolRisk } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("ListDisplaysTool", () => {
  const name = "computer_list_displays";
  const primary = new Display("display-1", 0, 0, 2560, 1440, 2, true);
  const secondary = new Display("display-2", 2560, 0, 1920, 1080, 1, false);
  const ends: readonly (readonly [ToolAbortReason, ToolFailureCode, string])[] = [
    [ToolAbortReason.Stopped, ToolFailureCode.Stopped, "The person stopped control before any input was sent. Wait for the person to resume it, and don't retry."],
    [ToolAbortReason.Cancelled, ToolFailureCode.Cancelled, "The call was cancelled before any input was sent."],
    [ToolAbortReason.SessionEnded, ToolFailureCode.Cancelled, "The call's session ended before any input was sent."],
    [ToolAbortReason.SwitchedOff, ToolFailureCode.Unavailable, "The computer-use module was switched off before any input was sent."],
    [ToolAbortReason.DeadlineReached, ToolFailureCode.TimedOut, "The call passed its deadline before any input was sent."]
  ];

  async function grantedAsync(): Promise<RuntimeHarness> {
    const harness = await RuntimeHarness.startAsync();
    const call = harness.callAsync(name, {});
    await harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce);
    await call;
    harness.backend.displays.signals.length = 0;

    return harness;
  }

  async function assertFailsAsync(call: Promise<unknown>, code: ToolFailureCode, message?: string): Promise<void> {
    await assert.rejects(call, t => t instanceof ToolFailureException && t.failure.code === code && (message === undefined || t.failure.message === message));
  }

  it("is a read-only tool from the low risk level", async () => {
    const harness = await RuntimeHarness.startAsync();
    const listed = harness.tools.registry.listTools().find(t => t.name === name);

    assert.deepEqual(listed?.risk, { default: ToolRisk.Low, maximum: ToolRisk.High });
    assert.equal(listed?.isReadOnly, true);
  });

  it("lists the backend's displays in their wire form", async () => {
    const harness = await grantedAsync();
    harness.backend.displays.displays = [primary, secondary];

    const result = await harness.callAsync(name, {});

    assert.deepEqual(result.structured, { displays: [primary.toJson(), secondary.toJson()] });
  });

  it("hands the backend the call's signal", async () => {
    const harness = await grantedAsync();
    const controller = new AbortController();

    await harness.callDirectlyAsync(name, {}, controller.signal);
    controller.abort(ToolAbortReason.Cancelled);

    assert.equal(harness.backend.displays.signals.length, 1);
    assert.equal(harness.backend.displays.signals[0]?.aborted, true);
  });

  it("refuses an input with a field", async () => {
    const harness = await grantedAsync();

    await assertFailsAsync(harness.callDirectlyAsync(name, { id: "display-1" }), ToolFailureCode.Refused);
    assert.deepEqual(harness.backend.displays.signals, []);
  });

  for (const [reason, code, message] of ends) {
    it(`fails as ${code} without asking the backend when the call has already ended as ${reason}`, async () => {
      const harness = await grantedAsync();

      await assertFailsAsync(harness.callDirectlyAsync(name, {}, AbortSignal.abort(reason)), code, message);
      assert.deepEqual(harness.backend.displays.signals, []);
    });

    it(`fails as ${code} when the call ends as ${reason} while the backend lists`, async () => {
      const harness = await grantedAsync();
      const controller = new AbortController();
      harness.backend.displays.listDisplaysAsync = async () => {
        controller.abort(reason);

        return [primary];
      };

      await assertFailsAsync(harness.callDirectlyAsync(name, {}, controller.signal), code, message);
    });

    it(`fails as ${code} when the backend gives up on a call that ended as ${reason}`, async () => {
      const harness = await grantedAsync();
      const controller = new AbortController();
      harness.backend.displays.listDisplaysAsync = async () => {
        controller.abort(reason);

        throw new TypeError("Aborted.");
      };

      await assertFailsAsync(harness.callDirectlyAsync(name, {}, controller.signal), code, message);
    });
  }

  it("fails as unavailable when the backend fails, keeping the backend's failure as the cause", async () => {
    const harness = await grantedAsync();
    const failure = new BackendFailureException("listDisplays");
    harness.backend.displays.failure = failure;

    await assert.rejects(harness.callDirectlyAsync(name, {}),
      t => t instanceof ToolFailureException && t.failure.code === ToolFailureCode.Unavailable && t.failure.message === "The displays could not be listed." && t.cause === failure);
  });

  it("writes the backend's failure to the module's log through the registry", async () => {
    const harness = await RuntimeHarness.startAsync();
    harness.backend.displays.failure = new BackendFailureException("listDisplays");

    const call = harness.callAsync(name, {});
    await harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Unavailable, /^The displays could not be listed\.$/);
    assert.deepEqual(harness.tools.messages.map(t => t.split("\n")[0]), [
      "The tool computer_list_displays failed with \"The displays could not be listed.\", caused by: BackendFailureException: The backend failed listDisplays."
    ]);
  });

  it("passes on a failure that isn't the backend's own as it is", async () => {
    const harness = await grantedAsync();
    const defect = new TypeError("A defect in the module.");
    harness.backend.displays.failure = defect;

    await assert.rejects(harness.callDirectlyAsync(name, {}), t => t === defect);
  });

  it("passes on a backend's own tool failure", async () => {
    const harness = await grantedAsync();
    const failure = new ToolFailureException(new ToolFailure(ToolFailureCode.Unavailable, "No display server."));
    harness.backend.displays.failure = failure;

    await assert.rejects(harness.callDirectlyAsync(name, {}), t => t === failure);
  });
});
