/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MessageChannel } from "node:worker_threads";

import { PhysicalInputKind } from "@noldova/computer-use.runtime";
import { AppWindow } from "@noldova/desktop.protocol";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("the watch for the person", () => {
  const statusEvent = "computer-use.statusChanged";
  const controlling = { state: "Controlling", sessionId: RuntimeHarness.sessionId };
  const stopped = { state: "Stopped", sessionId: null };
  const typing = { text: "abcd", summary: "Types the note's title." };
  const intervalMs = 1000;
  const deadlineMs = intervalMs * 3;

  async function beatingAsync(): Promise<RuntimeHarness> {
    const harness = await RuntimeHarness.startAsync(undefined, undefined, null, undefined, undefined, intervalMs);
    await harness.grantAppAsync(RuntimeHarness.notes);

    return harness;
  }

  async function holdInputAsync(harness: RuntimeHarness): Promise<{ readonly call: Promise<unknown>; readonly ended: Promise<void>; readonly release: () => void }> {
    const sending = Promise.withResolvers<void>();
    const released = Promise.withResolvers<void>();
    const ended = Promise.withResolvers<void>();
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      await sendAsync(target, chunk, signal);
      signal.addEventListener("abort", () => ended.resolve(), { once: true });
      sending.resolve();
      await released.promise;
    };
    const call = harness.callAsync("computer_type", typing);
    await sending.promise;

    return { call, ended: ended.promise, release: () => released.resolve() };
  }

  for (const kind of [PhysicalInputKind.Pointer, PhysicalInputKind.Keyboard])
    it(`stops control on the person's own ${kind.value.toLowerCase()} input while a tool sends, ending the input`, async () => {
      const harness = await RuntimeHarness.startAsync();
      await harness.grantAppAsync(RuntimeHarness.notes);
      const { call, ended, release } = await holdInputAsync(harness);

      harness.monitor.report(kind);
      await ended;
      release();

      await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.OutcomeUncertain, /^The call ended \(Stopped\) after some input may have been sent, so the outcome is uncertain\. Call computer_screenshot before acting again\.$/);
      await harness.tools.idleAsync();
      assert.equal(harness.monitor.isRunning, false);
      assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_displays", {}), ToolFailureCode.Stopped);
    });

  function stoppingOf(harness: RuntimeHarness): Promise<void> {
    const stopping = Promise.withResolvers<void>();
    harness.tools.onStopped(() => stopping.resolve());

    return stopping.promise;
  }

  it("leaves control running on the person's key presses that went to one of the app's own windows, matched by its process alone, without reading the window in front", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const { call, release } = await holdInputAsync(harness);
    harness.windows.foreground = null;

    harness.context.appWindows.answer("list", () => [new AppWindow(null, 42)]);
    harness.monitor.report(PhysicalInputKind.Keyboard, 42);
    release();
    await call;

    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
    assert.equal(harness.monitor.isRunning, false);
    assert.equal(harness.input.sent.length, 1);
  });

  const otherTargets: readonly (readonly [string, readonly AppWindow[], number | null])[] = [
    ["another process, while the app's windows are listed", [new AppWindow(7, 43)], 42],
    ["no one process the monitor could tell, while the app's windows are listed", [new AppWindow(7, 42)], null],
    ["the app's process, while the app has no window open", [], 42]
  ];

  for (const [target, listed, processId] of otherTargets)
    it(`stops control on the person's key press that went to ${target}`, async () => {
      const harness = await RuntimeHarness.startAsync();
      await harness.grantAppAsync(RuntimeHarness.notes);
      const { call, release } = await holdInputAsync(harness);
      const stopping = stoppingOf(harness);

      harness.context.appWindows.answer("list", () => listed);
      harness.monitor.report(PhysicalInputKind.Keyboard, processId);
      await stopping;
      release();

      await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.OutcomeUncertain);
      await harness.tools.idleAsync();
      assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
    });

  it("reads the app's windows afresh at each of the person's inputs: a key press to the same process stops control once its window is no longer the app's", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const listed: AppWindow[] = [];
    harness.context.appWindows.answer("list", () => listed);
    const first = await holdInputAsync(harness);
    listed.push(new AppWindow(7, 42));
    harness.monitor.report(PhysicalInputKind.Keyboard, 42);
    first.release();
    await first.call;
    assert.deepEqual(harness.context.published(statusEvent), [controlling]);

    listed.splice(0, 1, new AppWindow(7, 43));
    const second = await holdInputAsync(harness);
    const stopping = stoppingOf(harness);
    harness.monitor.report(PhysicalInputKind.Keyboard, 42);
    await stopping;
    second.release();

    await RuntimeHarness.assertFailsAsync(second.call, ToolFailureCode.OutcomeUncertain);
    await harness.tools.idleAsync();
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("stops control on the person's pointer input while one of the app's own windows is listed, since the monitor doesn't say which window it went to", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const { call, release } = await holdInputAsync(harness);
    const stopping = stoppingOf(harness);

    harness.context.appWindows.answer("list", () => [new AppWindow(null, 42)]);
    harness.monitor.report(PhysicalInputKind.Pointer, 42);
    await stopping;
    release();

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.OutcomeUncertain);
    await harness.tools.idleAsync();
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("counts the person's input from the moment the watch runs, not while the monitor starts", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const startAsync = harness.monitor.startAsync.bind(harness.monitor);
    harness.monitor.startAsync = async signal => {
      await startAsync(signal);
      harness.monitor.report(PhysicalInputKind.Pointer);
    };

    await harness.callAsync("computer_type", typing);

    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
  });

  it("switches off only once a start in progress has landed and stopped, before the module is switched on again", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const startAsync = harness.monitor.startAsync.bind(harness.monitor);
    const starting = Promise.withResolvers<void>();
    const held = Promise.withResolvers<void>();
    harness.monitor.startAsync = async () => {
      starting.resolve();
      await held.promise;
      await startAsync(new AbortController().signal);
    };
    const call = harness.callAsync("computer_type", typing);
    const failed = RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Unavailable, /^The computer-use module was switched off before any input was sent\.$/);
    await starting.promise;

    const off = harness.switchAsync(false);
    const listed = harness.tools.registry.listTools().length;
    held.resolve();
    await off;
    await harness.switchAsync(true);

    await failed;
    assert.equal(listed, 0);
    assert.equal(harness.tools.registry.listTools().length, 13);
    assert.equal(harness.monitor.isRunning, false);
  });

  it("stops control once three heartbeat intervals pass without a beat while a tool sends, and a beat starts the count again", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const harness = await beatingAsync();
    const { call, ended, release } = await holdInputAsync(harness);
    const failed = RuntimeHarness.assertFailsAsync(call, ToolFailureCode.OutcomeUncertain, /^The call ended \(Stopped\) after some input may have been sent, so the outcome is uncertain\. Call computer_screenshot before acting again\.$/);

    t.mock.timers.tick(deadlineMs - 1);
    harness.monitor.beat();
    t.mock.timers.tick(deadlineMs - 1);
    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
    t.mock.timers.tick(1);
    await ended;
    release();

    await failed;
    await harness.tools.idleAsync();
    assert.equal(harness.monitor.isRunning, false);
    assert.deepEqual(harness.context.published(statusEvent), [controlling, stopped]);
  });

  it("counts a beat that waited behind a send which held the thread past the deadline, so control goes on", async () => {
    const shortIntervalMs = 200;
    const harness = await RuntimeHarness.startAsync(undefined, undefined, null, undefined, undefined, shortIntervalMs);
    await harness.grantAppAsync(RuntimeHarness.notes);
    const channel = new MessageChannel();
    const beaten = Promise.withResolvers<void>();
    channel.port2.on("message", () => {
      harness.monitor.beat();
      beaten.resolve();
    });
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      harness.monitor.beat();
      channel.port1.postMessage(null);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)), 0, 0, shortIntervalMs * 5);
      await sendAsync(target, chunk, signal);
      await beaten.promise;
    };
    try {
      await harness.callAsync("computer_type", typing);
    } finally {
      channel.port1.close();
    }

    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
    assert.equal(harness.input.sent.length, 1);
  });

  it("counts no missed heartbeat between calls", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const harness = await beatingAsync();

    await harness.callAsync("computer_type", typing);
    t.mock.timers.tick(deadlineMs * 2);
    await harness.callAsync("computer_type", typing);

    assert.deepEqual(harness.context.published(statusEvent), [controlling]);
    assert.equal(harness.input.sent.length, 2);
  });

  it("fails every later input as unavailable when the monitor didn't stop, since it may still run", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    harness.monitor.stopFailure = new BackendFailureException("stopMonitor");
    await harness.callAsync("computer_type", typing);
    harness.monitor.stopFailure = null;

    for (let i = 0; i < 2; i++)
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", typing), ToolFailureCode.Unavailable, /^The watch for the person's own input could not start/);
    assert.equal(harness.monitor.isRunning, true);
    assert.equal(harness.input.sent.length, 1);
    assert.deepEqual(harness.context.written, []);
  });

  it("writes to the module's log a monitor that fails to stop other than as the backend, and still answers the input", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    harness.monitor.stopFailure = new TypeError("A defect in the hook.");

    await harness.callAsync("computer_type", typing);

    assert.deepEqual(harness.context.written, ["Computer use couldn't stop its watch for the person: TypeError: A defect in the hook."]);
    assert.equal(harness.input.sent.length, 1);
    harness.monitor.stopFailure = null;
  });

  it("passes on a failure to start the monitor that isn't the backend's own as it is, sending nothing", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    const defect = new TypeError("A defect in the module.");
    harness.monitor.startAsync = async () => {
      throw defect;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_type", typing), (error: unknown) => error === defect);
    assert.deepEqual(harness.input.sent, []);
  });

  it("reports a monitor that didn't stop when the module is switched off", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    harness.monitor.stopFailure = new BackendFailureException("stopMonitor");
    await harness.callAsync("computer_type", typing);

    const deactivating = harness.part.deactivateAsync();
    await assert.rejects(deactivating, BackendFailureException);
    await assert.rejects(deactivating, { message: "The backend failed stopMonitor." });
  });
});
