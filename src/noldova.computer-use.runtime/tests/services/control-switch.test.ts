/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PhysicalInputKind } from "@noldova/computer-use.runtime";
import { JsonException } from "@noldova/context.json";
import { PermissionOption, ToolAbortReason, ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("control", () => {
  const statusEvent = "computer-use.statusChanged";
  const controlling = { state: "Controlling", sessionId: RuntimeHarness.sessionId };
  const idle = { state: "Idle", sessionId: null };
  const stopped = { state: "Stopped", sessionId: null };
  const typing = { text: "abcd", summary: "Types the note's title." };

  async function stopAsync(harness: RuntimeHarness): Promise<void> {
    assert.deepEqual(await harness.context.callMethodAsync("computer-use.stop", {}), {});
  }

  async function switchAsync(harness: RuntimeHarness, isOn: boolean): Promise<void> {
    await harness.switchAsync(isOn);
  }

  const ownStops: readonly ((harness: RuntimeHarness) => Promise<void>)[] = [
    async harness => await stopAsync(harness),
    async harness => harness.context.stopWork(),
    async harness => {
      const sendAsync = harness.input.typeTextAsync.bind(harness.input);
      harness.input.typeTextAsync = async (target, chunk, signal) => {
        await sendAsync(target, chunk, signal);
        harness.monitor.report(PhysicalInputKind.Keyboard);
      };
      await assert.rejects(harness.callAsync("computer_type", typing));
      await harness.tools.idleAsync();
    }
  ];

  it("starts once the session grant is given: the work is listed and the status says who controls, with no watch between calls", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_displays", {});
    const pending = await harness.answerer.nextAsync();
    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.context.listedWork(), []);
    harness.answerer.answer(pending.id, PermissionOption.AllowOnce);
    await call;
    await harness.callAsync("computer_list_displays", {});

    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
  });

  it("watches for the person only while a tool sends input, never while a request waits for the person", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const watching: boolean[] = [];
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      watching.push(harness.monitor.isRunning);
      await sendAsync(target, chunk, signal);
    };

    const request = harness.callAsync("computer_request_apps", { apps: [RuntimeHarness.files.identity.id], reason: "To open the folder." });
    const pending = await harness.answerer.nextAsync();
    assert.equal(harness.monitor.isRunning, false);
    harness.answerer.answer(pending.id, PermissionOption.AllowAlways);
    await request;
    await harness.callAsync("computer_type", typing);

    assert.deepEqual(watching, [true]);
    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
  });

  it("follows the conversation's next session in control, keeping one listed work item", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    const next = harness.callAsync("computer_list_displays", {}, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await next;

    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, { state: "Controlling", sessionId: "session-2" }]);
  });

  it("doesn't start when the session grant is denied", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_displays", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Denied);

    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), []);
  });

  it("stops from the window through the base: the call waiting for its answer is withdrawn with its request, and every later call fails at once", async () => {
    const harness = await RuntimeHarness.startAsync();

    const waiting = harness.callAsync("computer_list_displays", {});
    const pending = await harness.answerer.nextAsync();
    await stopAsync(harness);

    await RuntimeHarness.assertFailsAsync(waiting, ToolFailureCode.Withdrawn);
    assert.equal(pending.signal.aborted, true);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped, /until the person resumes it/);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2"), ToolFailureCode.Stopped);
    assert.equal(harness.answerer.delivered().length, 1);
    assert.deepEqual(harness.context.published(statusEvent), [stopped]);
  });

  it("ends the input in flight at the next chunk, failing it as uncertain", async () => {
    const harness = await RuntimeHarness.startAsync(undefined, 2);
    await harness.grantAppAsync(RuntimeHarness.notes);
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      await sendAsync(target, chunk, signal);
      await stopAsync(harness);
    };

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", typing), ToolFailureCode.OutcomeUncertain, /^The call ended \(Stopped\) after some input may have been sent, so the outcome is uncertain\. Call computer_screenshot before acting again\.$/);
    await harness.tools.idleAsync();
    assert.deepEqual(harness.input.sent.map(t => t.text), ["ab"]);
  });

  it("ends the listed work when it stops, and stopping twice publishes once", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    await stopAsync(harness);
    await stopAsync(harness);

    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("gives the base the reason for each stop: the pane, the listed work, or the person's input", async () => {
    const reasons: string[] = [];
    for (const ownStopAsync of ownStops) {
      const harness = await RuntimeHarness.startAsync();
      await harness.grantAppAsync(RuntimeHarness.notes);
      harness.tools.onStopped(t => reasons.push(t));

      await ownStopAsync(harness);
    }

    assert.deepEqual(reasons, [
      "The person stopped computer use.",
      "The person stopped the work that controls the screen.",
      "The person used the pointer or the keyboard, which stops computer use."
    ]);
  });

  it("follows a stop that another module or the base gives, ending its work", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.tools.stopAll("The person stopped every agent.");

    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
  });

  it("stops when the person stops the listed work", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.context.stopWork();

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("follows the person's resume through the base, keeping the session's grant: the next call starts control again", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    await stopAsync(harness);

    const asked = harness.answerer.delivered().length;
    harness.tools.resumeAll();
    await harness.callAsync("computer_list_displays", {});

    assert.equal(harness.answerer.delivered().length, asked);
    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped, idle, controlling]);
  });

  it("does nothing on a resume while control runs", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.tools.resumeAll();

    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
  });

  it("answers the status as it is now, so a window that opens while a session controls the screen shows it", async () => {
    const harness = await RuntimeHarness.startAsync();
    const readAsync = async (): Promise<unknown> => await harness.context.callMethodAsync("computer-use.statusRead", {});
    assert.deepEqual(await readAsync(), idle);

    await harness.grantAppAsync(RuntimeHarness.notes);
    assert.deepEqual(await readAsync(), controlling);
    await stopAsync(harness);
    assert.deepEqual(await readAsync(), stopped);
    harness.tools.resumeAll();

    assert.deepEqual(await readAsync(), idle);
    await assert.rejects(harness.context.callMethodAsync("computer-use.statusRead", { sessionId: RuntimeHarness.sessionId }), JsonException);
  });

  it("refuses a stop whose payload has a field, changing nothing, and offers no resume of its own", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    await assert.rejects(harness.context.callMethodAsync("computer-use.stop", { force: true }), JsonException);
    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
    await stopAsync(harness);
    await assert.rejects(harness.context.callMethodAsync("computer-use.resume", {}), /isn't registered/);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("ends with the session in control: the work ends and the status says idle", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.endSession("session-2");
    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    harness.endSession(RuntimeHarness.sessionId);

    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, idle]);
  });

  it("stays in control while an earlier session of the conversation can still act, following it back when the later one ends first", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const next = harness.callAsync("computer_list_displays", {}, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await next;

    harness.endSession("session-2");
    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    harness.endSession(RuntimeHarness.sessionId);

    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, { state: "Controlling", sessionId: "session-2" }, controlling, idle]);
  });

  it("names a session that acts again as the latest, so its end goes back to the other session", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const next = harness.callAsync("computer_list_displays", {}, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await next;
    await harness.callAsync("computer_list_displays", {});

    harness.endSession(RuntimeHarness.sessionId);
    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    harness.endSession("session-2");

    const second = { state: "Controlling", sessionId: "session-2" };
    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, second, controlling, second, idle]);
  });

  it("keeps the latest session in control when an earlier one of the conversation ends", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const next = harness.callAsync("computer_list_displays", {}, undefined, RuntimeHarness.scope, "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await next;

    harness.endSession(RuntimeHarness.sessionId);
    assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
    harness.endSession("session-2");

    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, { state: "Controlling", sessionId: "session-2" }, idle]);
  });

  it("stays stopped when the session in control ends while stopped", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    await stopAsync(harness);

    harness.endSession(RuntimeHarness.sessionId);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("fails the input as unavailable when the watch can't start, sending nothing", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    await harness.monitor.startAsync(new AbortController().signal);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", typing), ToolFailureCode.Unavailable, /could not start/);
    assert.deepEqual(harness.input.sent, []);
    assert.deepEqual(harness.tools.messages.map(t => t.split("\n")[0]), [
      "The tool computer_type failed with \"The watch for the person's own input could not start, so the screen can't be controlled. Nothing was sent.\", "
        + "caused by: MonitorRunningException: The physical input monitor is already running."
    ]);
  });

  it("fails the input by its end when it ends while the watch starts, leaving nothing watching", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const controller = new AbortController();
    const startAsync = harness.monitor.startAsync.bind(harness.monitor);
    harness.monitor.startAsync = async signal => {
      await startAsync(signal);
      controller.abort(ToolAbortReason.Cancelled);
    };

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", typing, controller.signal), ToolFailureCode.Cancelled);
    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails the input by its end when it ends before the watch starts", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const controller = new AbortController();
    harness.monitor.startAsync = async signal => {
      controller.abort(ToolAbortReason.Cancelled);
      signal.throwIfAborted();
    };

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", typing, controller.signal), ToolFailureCode.Cancelled);
    assert.deepEqual(harness.input.sent, []);
  });

  it("ends the work, says idle and ends the status event when the module is switched off, publishing nothing after", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    await harness.part.deactivateAsync();
    await stopAsync(harness);

    assert.deepEqual(harness.context.listedWork(), []);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, idle]);
  });

  it("says idle when the module is switched off during control, and starts idle when it's switched on again", async () => {
    const harness = await RuntimeHarness.startAsync();
    const first = harness.context;
    await harness.grantAppAsync(RuntimeHarness.notes);

    await switchAsync(harness, false);
    assert.deepEqual(first.published(statusEvent), [controlling, idle]);
    assert.deepEqual(first.listedWork(), []);
    await switchAsync(harness, true);

    assert.deepEqual(await harness.context.callMethodAsync("computer-use.statusRead", {}), idle);
    assert.deepEqual(harness.context.published(statusEvent), []);
  });

  it("says idle when the module is switched off while stopped", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    await stopAsync(harness);

    await switchAsync(harness, false);

    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped, idle]);
  });

  it("keeps its own stop, from its item, its work or the person's input, for the person to resume when the module is switched off and on", async () => {
    for (const ownStopAsync of ownStops) {
      const harness = await RuntimeHarness.startAsync();
      const first = harness.context;
      await harness.grantAppAsync(RuntimeHarness.notes);
      await ownStopAsync(harness);

      await switchAsync(harness, false);
      await switchAsync(harness, true);
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
      harness.tools.resumeAll();
      const call = harness.callAsync("computer_list_displays", {});
      await harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce);
      await call;

      assert.deepEqual(harness.context.listedWork(), ["An agent controls the screen"]);
      assert.deepEqual([first.published(statusEvent), harness.context.published(statusEvent)], [[controlling, stopped, idle], [stopped, idle, controlling]]);
    }
  });

  it("keeps a stop that the base or another module gave when the module is switched off and on", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    harness.tools.stopAll("The person stopped every agent.");

    await switchAsync(harness, false);
    await switchAsync(harness, true);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
  });

  it("starts as stopped when the person stopped every agent before the module was switched on, and as idle when control runs", async () => {
    const readAsync = async (harness: RuntimeHarness): Promise<unknown> => await harness.context.callMethodAsync("computer-use.statusRead", {});
    const running = await RuntimeHarness.startAsync();
    await switchAsync(running, false);
    await switchAsync(running, true);
    const halted = await RuntimeHarness.startAsync();
    await switchAsync(halted, false);
    halted.tools.stopAll("The person stopped every agent.");

    await switchAsync(halted, true);

    assert.deepEqual([await readAsync(running), await readAsync(halted)], [idle, stopped]);
  });

  it("tells the window that control is stopped as the module is switched on, when every agent was stopped while it was off", async () => {
    const running = await RuntimeHarness.startAsync();
    await switchAsync(running, false);
    await switchAsync(running, true);
    const halted = await RuntimeHarness.startAsync();
    await switchAsync(halted, false);
    halted.tools.stopAll("The person stopped every agent.");

    await switchAsync(halted, true);

    assert.deepEqual([running.context.published(statusEvent), halted.context.published(statusEvent)], [[], [stopped]]);
  });

  it("keeps a stop made before the module was switched on when it's switched off and on again, still saying stopped", async () => {
    const harness = await RuntimeHarness.startAsync();
    await switchAsync(harness, false);
    harness.tools.stopAll("The person stopped every agent.");
    await switchAsync(harness, true);

    await switchAsync(harness, false);
    await switchAsync(harness, true);

    assert.deepEqual(await harness.context.callMethodAsync("computer-use.statusRead", {}), stopped);
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
  });

  it("keeps its own stop for the person to resume when the module is switched off while one of its calls still finishes, logging nothing", async () => {
    const harness = await RuntimeHarness.startAsync();
    const first = harness.context;
    await harness.grantAppAsync(RuntimeHarness.notes);
    let release = (): void => undefined;
    const held = new Promise<void>(t => {
      release = t;
    });
    let reached = (): void => undefined;
    const stoppedInCall = new Promise<void>(t => {
      reached = t;
    });
    harness.input.typeTextAsync = async () => {
      await stopAsync(harness);
      reached();
      await held;
    };

    const typed = assert.rejects(harness.callAsync("computer_type", typing));
    await stoppedInCall;
    const off = switchAsync(harness, false);
    release();
    await typed;
    await off;
    await harness.tools.idleAsync();
    await switchAsync(harness, true);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
    assert.deepEqual([first.written, harness.context.written], [[], []]);
  });

  it("is stopped by the harness at a test's end while a tool still sends, ending the watch and its heartbeat deadline with no tick of the clock", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const sending = Promise.withResolvers<void>();
    const released = Promise.withResolvers<void>();
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      await sendAsync(target, chunk, signal);
      sending.resolve();
      await released.promise;
    };
    const failed = RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", typing), ToolFailureCode.OutcomeUncertain, /^The call ended \(Stopped\)/);
    await sending.promise;

    RuntimeHarness.endWatches();
    released.resolve();

    await failed;
    await harness.tools.idleAsync();
    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);

    harness.tools.resumeAll();
    t.mock.timers.tick(RuntimeHarness.heartbeatIntervalMs * 3);
    await harness.callAsync("computer_type", typing);
    assert.equal(harness.tools.isStopped, false);
  });
});
