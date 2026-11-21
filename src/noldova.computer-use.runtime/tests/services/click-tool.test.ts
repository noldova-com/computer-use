/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ClickCount, DesktopPoint, ModifierKey, PointerButton, RefusalReason } from "@noldova/computer-use.runtime";
import { MacScriptFailedException } from "@noldova/computer-use.runtime/macos";
import { ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { ClickCalls } from "./click-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

const summary = ClickCalls.summary;

describe("computer_click", () => {
  it("clicks the desktop point under the screenshot's pixel, raising a request the remembered grant answers without asking", async () => {
    const harness = await ClickCalls.shotAsync(0.5);
    const asked = harness.answerer.delivered().length;

    const result = await harness.callAsync("computer_click", ClickCalls.clicking(1, 2));

    assert.deepEqual(result.structured, { clicked: 1 });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.points, t.button, t.count, t.modifiers, t.target]), [
      ["click", [new DesktopPoint(3, 5)], PointerButton.Left, ClickCount.Single, [], RuntimeHarness.windowOf(RuntimeHarness.notes).target]
    ]);
    assert.equal(harness.answerer.delivered().length, asked);
    const record = harness.center.records().at(-1);
    assert.equal(record?.action, "computer-use.controlApp");
    assert.equal(record?.subject, RuntimeHarness.notes.identity.id);
    assert.equal(record?.isRemembered, true);
    assert.deepEqual(record?.details, [
      { name: "input", value: "click" },
      { name: "point", value: "1, 2" },
      { name: "button", value: "Left" },
      { name: "count", value: "1" },
      { name: "modifiers", value: "none" },
      { name: "app", value: "Notes" },
      { name: "identity", value: RuntimeHarness.notes.identity.id },
      { name: "summary", value: summary }
    ]);
  });

  it("sends the button, the count and the modifiers it is given, the modifiers in any case and order", async () => {
    const harness = await ClickCalls.shotAsync();

    await harness.callAsync("computer_click", ClickCalls.clicking(0, 0, { button: "right", count: 2, modifiers: "shift+Control" }));
    await harness.callAsync("computer_click", ClickCalls.clicking(0, 0, { button: "middle", count: 3 }));

    assert.deepEqual(harness.input.sent.map(t => [t.button, t.count, t.modifiers]), [
      [PointerButton.Right, ClickCount.Double, [ModifierKey.Control, ModifierKey.Shift]],
      [PointerButton.Middle, ClickCount.Triple, []]
    ]);
    assert.deepEqual(harness.center.records().at(-2)?.details.slice(1, 5), [
      { name: "point", value: "0, 0" },
      { name: "button", value: "Right" },
      { name: "count", value: "2" },
      { name: "modifiers", value: "Control+Shift" }
    ]);
  });

  it("refuses without raising a request when its app isn't granted", async () => {
    const harness = await ClickCalls.shotAsync();
    harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.files);
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Refused, /File Explorer isn't granted to this session/);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails by the backend's refusal before sending, and as uncertain for one after sending or a backend failure", async () => {
    const harness = await ClickCalls.shotAsync();

    harness.input.refusalBeforeSending = RefusalReason.OtherWindowAtPoint;
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Stale, /another window lies under the point\. Nothing was sent/);
    harness.input.refusalBeforeSending = RefusalReason.PhysicalInput;
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Stopped);
    harness.input.refusalBeforeSending = null;
    harness.input.refusalAfterSending = RefusalReason.ForegroundChanged;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.OutcomeUncertain, /may already have been sent/);
    harness.input.refusalAfterSending = null;
    harness.input.clickAsync = async () => {
      throw new BackendFailureException("click");
    };
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.OutcomeUncertain, /backend failed during the input/);
  });

  it("keeps the backend's failure as the cause, when the click fails and when the window stack can't be listed", async () => {
    const harness = await ClickCalls.shotAsync();
    const clickFailure = new MacScriptFailedException("click", "The click could not be sent.");
    harness.input.clickAsync = async () => {
      throw clickFailure;
    };
    await assert.rejects(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0)), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.OutcomeUncertain && error.cause === clickFailure);

    const stackFailure = new BackendFailureException("listStack");
    harness.windows.listStackAsync = async () => {
      throw stackFailure;
    };
    await assert.rejects(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0)), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.cause === stackFailure);
  });

  it("fails by the call's end before sending, and as uncertain when the call ends while the click is sent", async () => {
    const harness = await ClickCalls.shotAsync();
    const window = harness.windows.foreground;
    const before = new AbortController();
    harness.windows.getForegroundWindowAsync = async () => {
      before.abort(ToolAbortReason.DeadlineReached);

      return window;
    };

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0), before.signal), ToolFailureCode.TimedOut);
    assert.deepEqual(harness.input.sent, []);

    harness.windows.getForegroundWindowAsync = async () => window;
    const during = new AbortController();
    const clickAsync = harness.input.clickAsync.bind(harness.input);
    harness.input.clickAsync = async (...values) => {
      await clickAsync(...values);
      during.abort(ToolAbortReason.Stopped);
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0), during.signal), ToolFailureCode.OutcomeUncertain, /The call ended \(Stopped\)/);
    assert.equal(harness.input.sent.length, 1);
  });
});
