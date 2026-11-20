/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it, type TestContext } from "node:test";

import { type Heartbeat, KeyName, MonitorRunningException, type PhysicalInput, PhysicalInputKind } from "@noldova/computer-use.runtime";
import type { MacBackend } from "@noldova/computer-use.runtime/macos";

import type { MacScriptChannelDouble } from "../doubles/mac-script-channel-double.fixture.ts";
import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const INTERVAL_MS = 500;

after(() => {
  MacBackendHarness.removeStops();
});

class WatchRun {
  public readonly backend: MacBackend;
  public readonly beats: Heartbeat[] = [];
  public readonly channel: MacScriptChannelDouble;
  public readonly inputs: PhysicalInput[] = [];
  public readonly written: readonly string[];
  private readonly t: TestContext;

  public constructor(t: TestContext) {
    t.mock.timers.enable({ apis: ["setInterval"] });
    const { channel, backend, written } = MacBackendHarness.start();
    this.t = t;
    this.backend = backend;
    this.channel = channel;
    this.written = written;
    backend.physicalInput.onPhysicalInput(input => this.inputs.push(input));
    backend.physicalInput.onHeartbeat(beat => this.beats.push(beat));
  }

  public tick(): void {
    this.t.mock.timers.tick(INTERVAL_MS);
  }

  public async beatAsync(): Promise<void> {
    const beat = Promise.withResolvers<void>();
    const subscription = this.backend.physicalInput.onHeartbeat(() => beat.resolve());
    this.tick();
    await beat.promise;
    subscription[Symbol.dispose]();
  }
}

describe("the macOS backend's watch for the person", () => {
  it("polls the pointer every 500 milliseconds, each answer a heartbeat", async t => {
    const run = new WatchRun(t);

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    await run.beatAsync();
    await run.beatAsync();

    assert.equal(run.backend.physicalInput.heartbeatIntervalMs, INTERVAL_MS);
    assert.deepEqual(run.channel.calls.map(c => c.method), ["startWatch", "pollWatch", "pollWatch"]);
    assert.deepEqual(run.beats.map(b => b.sequence), [1, 2]);
    assert.deepEqual(run.inputs, []);
    await run.backend.physicalInput.stopAsync();
  });

  it("reports the pointer the person moved, with the poll's beat", async t => {
    const run = new WatchRun(t);
    run.channel.answers.set("pollWatch", { hasMoved: true });

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    await run.beatAsync();

    assert.deepEqual(run.inputs.map(i => i.kind), [PhysicalInputKind.Pointer]);
    assert.equal(run.beats.length, 1);
    await run.backend.physicalInput.stopAsync();
  });

  it("sends no beat for a poll that fails, so the watch counts it missed", async t => {
    const run = new WatchRun(t);
    run.channel.failures.add("pollWatch");

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    run.tick();
    await run.backend.physicalInput.stopAsync();

    assert.deepEqual(run.channel.calls.map(c => c.method), ["startWatch", "pollWatch", "stopWatch"]);
    assert.deepEqual([run.beats, run.written], [[], []]);
  });

  it("writes to the module's log a poll that fails other than as the process, and sends no beat for it", async t => {
    const run = new WatchRun(t);
    run.channel.answers.setBy("pollWatch", () => {
      throw new Error("The poll broke.");
    });

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    run.tick();
    await run.backend.physicalInput.stopAsync();

    assert.deepEqual(run.beats, []);
    assert.deepEqual(run.written, ["The macOS watch for the person couldn't poll the pointer: Error: The poll broke."]);
  });

  it("skips an interval while the last poll still waits, and drops an answer that comes after the stop", async t => {
    const run = new WatchRun(t);
    const answer = Promise.withResolvers<unknown>();
    run.channel.answers.setBy("pollWatch", () => answer.promise);

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    run.tick();
    run.tick();
    const stopping = run.backend.physicalInput.stopAsync();
    answer.resolve({ hasMoved: true });
    await stopping;

    assert.deepEqual(run.channel.calls.map(c => c.method), ["startWatch", "pollWatch", "stopWatch"]);
    assert.deepEqual([run.beats, run.inputs], [[], []]);
  });

  it("stops polling at the stop, and a second stop does nothing", async t => {
    const run = new WatchRun(t);

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    await run.backend.physicalInput.stopAsync();
    await run.backend.physicalInput.stopAsync();
    run.tick();

    assert.deepEqual(run.channel.calls.map(c => c.method), ["startWatch", "stopWatch"]);
  });

  it("marks each input sent while the watch runs as watched, so the process refuses it once a restart has lost the watch, and none before or after", async t => {
    const run = new WatchRun(t);
    const signal = HangGuard.signal();
    const press = (): Promise<void> => run.backend.input.pressKeyAsync(MacBackendHarness.target, KeyName.Tab, [], signal);

    await press();
    await run.backend.physicalInput.startAsync(signal);
    await press();
    await run.backend.physicalInput.stopAsync();
    await press();

    assert.deepEqual(run.channel.named("pressKey").map(p => "watched" in p ? p.watched : null), [false, true, false]);
  });

  it("refuses a second start, and starts nothing once the call has ended", async t => {
    const run = new WatchRun(t);

    await assert.rejects(run.backend.physicalInput.startAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(run.channel.calls, []);
    await run.backend.physicalInput.startAsync(HangGuard.signal());
    const restarting = run.backend.physicalInput.startAsync(HangGuard.signal());
    await assert.rejects(restarting, MonitorRunningException);
    await assert.rejects(restarting, { message: "The physical input monitor is already running." });
    await run.backend.physicalInput.stopAsync();
  });

  it("reaches no listener once its subscription is disposed", async t => {
    const run = new WatchRun(t);
    const disposedInputs: PhysicalInput[] = [];
    const disposedBeats: Heartbeat[] = [];
    run.backend.physicalInput.onPhysicalInput(input => disposedInputs.push(input))[Symbol.dispose]();
    run.backend.physicalInput.onHeartbeat(beat => disposedBeats.push(beat))[Symbol.dispose]();

    await run.backend.physicalInput.startAsync(HangGuard.signal());
    await run.beatAsync();

    assert.deepEqual([disposedInputs.length, disposedBeats.length, run.inputs.length, run.beats.length], [0, 0, 0, 1]);
    await run.backend.physicalInput.stopAsync();
  });
});
