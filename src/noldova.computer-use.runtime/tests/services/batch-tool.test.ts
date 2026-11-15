/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject, JsonValue } from "@noldova/computer-use.protocol";
import { DesktopPoint, PhysicalInputKind } from "@noldova/computer-use.runtime";
import { AppShortcut, KeyChord } from "@noldova/desktop.protocol";
import { PermissionDecision, ToolAbortReason, ToolFailureCode } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("computer_batch", () => {
  const summary = "Fills in the note's title.";
  const click = { action: "click", x: 1, y: 2 };
  const typing = { action: "type", text: "Plans" };
  const enter = { action: "key", keys: "Enter" };

  function listing(...actions: JsonValue[]): JsonObject {
    return { actions, summary };
  }

  async function shotAsync(): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", {});

    return harness;
  }

  function betweenActions(harness: RuntimeHarness, hook: () => void): void {
    const readAsync = harness.windows.getForegroundWindowAsync.bind(harness.windows);
    let reads = 0;
    harness.windows.getForegroundWindowAsync = async signal => {
      reads += 1;
      if (reads > 1)
        hook();

      return await readAsync(signal);
    };
  }

  it("runs each action in order through its own tool, each raising its own request with the list's summary, and returns each one's result", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;
    const delivered = harness.answerer.delivered().length;

    const result = await harness.callAsync("computer_batch", listing(
      click,
      { action: "scroll", x: 1, y: 2, direction: "down", amount: 3 },
      { action: "move", x: 4, y: 4 },
      { action: "drag", from: [1, 1], to: [3, 2] },
      typing,
      enter
    ));

    assert.deepEqual(result.structured, {
      ran: 6,
      results: [{ clicked: 1 }, { scrolled: 3 }, { moved: [4, 4] }, { dragged: [[1, 1], [3, 2]] }, { typed: 5 }, { pressed: 1 }]
    });
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click", "scroll", "move", "drag", "type", "press"]);
    assert.deepEqual(harness.input.sent[0]?.points, [new DesktopPoint(1, 2)]);
    assert.equal(harness.answerer.delivered().length, delivered);
    const records = harness.center.records().slice(asked);
    assert.deepEqual(records.map(t => [t.action, t.subject, t.isRemembered, t.details[0]?.value, t.details.find(u => u.name === "summary")?.value]), [
      ["computer-use.controlApp", RuntimeHarness.notes.identity.id, true, "click", summary],
      ["computer-use.controlApp", RuntimeHarness.notes.identity.id, true, "scroll", summary],
      ["computer-use.controlApp", RuntimeHarness.notes.identity.id, true, "move", undefined],
      ["computer-use.controlApp", RuntimeHarness.notes.identity.id, true, "drag", summary],
      ["computer-use.controlApp", RuntimeHarness.notes.identity.id, true, "type", summary],
      ["computer-use.controlApp", RuntimeHarness.notes.identity.id, true, "key", summary]
    ]);
  });

  it("watches for the person once, from before the first action to the end of the last", async () => {
    const harness = await shotAsync();
    const startAsync = harness.monitor.startAsync.bind(harness.monitor);
    let starts = 0;
    harness.monitor.startAsync = async signal => {
      starts += 1;
      await startAsync(signal);
    };
    const watching: boolean[] = [];
    betweenActions(harness, () => watching.push(harness.monitor.isRunning));

    await harness.callAsync("computer_batch", listing(click, typing, enter));

    assert.equal(starts, 1);
    assert.deepEqual(watching, [true, true]);
    assert.equal(harness.monitor.isRunning, false);
  });

  it("ends the list at the first action that fails, running none after it, and says how many ran", async () => {
    const harness = await shotAsync();
    harness.input.isPasswordFieldFocused = true;

    await RuntimeHarness.assertFailsAsync(
      harness.callAsync("computer_batch", listing(click, typing, enter)),
      ToolFailureCode.OutcomeUncertain,
      /^1 of 3 actions ran; action 2 \(type\) failed: .*password/
    );
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
    assert.equal(harness.monitor.isRunning, false);
  });

  it("keeps the backend's failure of an action as the cause the registry logs for the list", async () => {
    const harness = await shotAsync();
    harness.input.pressKeyAsync = async () => {
      throw new BackendFailureException("pressKey");
    };
    const message = "1 of 2 actions ran; action 2 (key) failed: The backend failed during the input, so some of it may have been sent and the outcome is uncertain. "
      + "Call computer_screenshot before acting again.";

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_batch", listing(click, enter)), ToolFailureCode.OutcomeUncertain);

    assert.deepEqual(harness.tools.messages.map(t => t.split("\n")[0]), [
      `The tool computer_batch failed with "${message}", caused by: BackendFailureException: The backend failed pressKey.`
    ]);
  });

  it("asks each action's app as its own tool does, so an action in an app without a grant ends the list", async () => {
    const harness = await shotAsync();
    betweenActions(harness, () => {
      harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.terminal);
    });

    await RuntimeHarness.assertFailsAsync(
      harness.callAsync("computer_batch", listing(click, typing)),
      ToolFailureCode.OutcomeUncertain,
      /^1 of 2 actions ran; action 2 \(type\) failed: .*Command Prompt/
    );
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
  });

  it("stops when the person's input comes between two actions, running none after it", async () => {
    const harness = await shotAsync();
    let reported = false;
    betweenActions(harness, () => {
      if (!reported) {
        reported = true;
        harness.monitor.report(PhysicalInputKind.Pointer);
      }
    });

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_batch", listing(click, typing, enter)), ToolFailureCode.OutcomeUncertain,
      /^1 of 3 actions ran; action 2 \(type\) failed: The person stopped control before any input was sent\. Wait for the person to resume it, and don't retry\.$/);
    await harness.tools.idleAsync();
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_batch", listing(click)), ToolFailureCode.Stopped, /until the person resumes it/);
  });

  it("stops when the person stops control during an action, failing it as uncertain and running none after it", async () => {
    const harness = await shotAsync();
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      await sendAsync(target, chunk, signal);
      assert.deepEqual(await harness.context.callMethodAsync("computer-use.stop", {}), {});
    };

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_batch", listing(click, typing, enter)), ToolFailureCode.OutcomeUncertain,
      /^1 of 3 actions ran; action 2 \(type\) failed: The call ended \(Stopped\) after some input may have been sent, so the outcome is uncertain\. Call computer_screenshot before acting again\.$/);
    await harness.tools.idleAsync();
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click", "type"]);
  });

  it("refuses an action's malformed arguments at its turn, after the actions before it ran", async () => {
    for (const key of [{ action: "key", keys: "Control+" }, { action: "key" }]) {
      const harness = await shotAsync();

      await RuntimeHarness.assertFailsAsync(
        harness.callDirectlyAsync("computer_batch", listing(click, key)),
        ToolFailureCode.Refused,
        /^1 of 2 actions ran; action 2 \(key\) failed: computer_key takes keys/
      );
      assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
      assert.equal(harness.monitor.isRunning, false);
    }
  });

  it("passes on an error that isn't a tool's failure as it is, ending the list", async () => {
    const harness = await shotAsync();
    const broken = new Error("The center broke.");
    let asks = 0;
    harness.center.intercept = request => (request.isRememberedOnly === true && ++asks === 2 ? Promise.reject(broken) : null);

    await assert.rejects(harness.callDirectlyAsync("computer_batch", listing(click, enter, typing)), t => t === broken);
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
    assert.equal(harness.monitor.isRunning, false);
  });

  it("ends the list when the call ends while an action's request is answered, before that action marks sending", async () => {
    const harness = await shotAsync();
    const ending = new AbortController();
    let asks = 0;
    harness.center.intercept = request => {
      if (request.isRememberedOnly !== true || ++asks !== 2)
        return null;
      ending.abort(ToolAbortReason.Cancelled);

      return Promise.resolve(PermissionDecision.AllowedOnce);
    };

    await RuntimeHarness.assertFailsAsync(
      harness.callDirectlyAsync("computer_batch", listing(click, enter), ending.signal),
      ToolFailureCode.Cancelled,
      /^1 of 2 actions ran; action 2 \(key\) failed: The call was cancelled before any input was sent\.$/
    );
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
    assert.equal(harness.monitor.isRunning, false);
  });

  it("refuses a system key combination, a list empty or over ten, an unknown action, an action's own summary or no summary, before anything runs", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(
      harness.callAsync("computer_batch", listing(click, { action: "key", keys: "Meta+R" })),
      ToolFailureCode.Refused,
      /^Meta\+R is a key combination the operating system handles.*computer_key\. Nothing was sent\.$/
    );
    for (const input of [
      listing(),
      listing(...Array.from({ length: 11 }, () => click)),
      listing(click, { action: "wait", seconds: 1 }),
      listing(click, { ...typing, summary }),
      listing(click, "type"),
      { actions: "click", summary },
      { actions: [click] },
      { actions: [click], summary: "" },
      { actions: [click], summary, display: "display-1" }
    ])
      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_batch", input), ToolFailureCode.Refused, /^computer_batch takes actions, 1 to 10 items/);

    assert.deepEqual(harness.input.sent, []);
    assert.equal(harness.center.records().length, asked);
    assert.equal(harness.monitor.isRunning, false);
  });

  it("refuses a list whose later key action is one of the app's own shortcuts before anything runs, sending none of the actions before it", async () => {
    const harness = await shotAsync();
    harness.context.listedShortcuts = [new AppShortcut(KeyChord.parse("Mod+K"), "notes.open", false)];
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(
      harness.callAsync("computer_batch", listing(click, { action: "key", keys: "Control+K" })),
      ToolFailureCode.Refused,
      /^Control\+K is one of the app's own shortcuts, such as the one that stops control, so it is never sent\. Nothing was sent\.$/
    );

    assert.deepEqual(harness.input.sent, []);
    assert.equal(harness.center.records().length, asked);
    assert.equal(harness.monitor.isRunning, false);
  });
});
