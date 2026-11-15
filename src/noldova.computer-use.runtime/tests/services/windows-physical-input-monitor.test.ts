/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Heartbeat, MonitorRunningException, type PhysicalInput, PhysicalInputKind } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

describe("the Windows backend's physical input monitor", () => {
  it("reports the person's pointer and keyboard use and the heartbeats of its run at the time they arrive, and ignores unknown kinds", async t => {
    t.mock.timers.enable({ apis: ["Date"], now: 1_234 });
    const { api, backend } = WindowsBackendHarness.start();
    const inputs: PhysicalInput[] = [];
    const heartbeats: Heartbeat[] = [];
    backend.physicalInput.onPhysicalInput(t => inputs.push(t));
    backend.physicalInput.onHeartbeat(t => heartbeats.push(t));

    await backend.physicalInput.startAsync(HangGuard.signal());
    api.onPhysicalInput?.(0, 0);
    api.onPhysicalInput?.(1, 42);
    api.onPhysicalInput?.(7, 42);
    api.onHeartbeat?.(1);

    assert.deepEqual(api.named("startMonitor"), [[500]]);
    assert.deepEqual(inputs.map(t => t.kind), [PhysicalInputKind.Pointer, PhysicalInputKind.Keyboard]);
    assert.deepEqual(inputs.map(t => t.processId), [null, 42]);
    assert.deepEqual(heartbeats.map(t => t.sequence), [1]);
    assert.deepEqual([...inputs, ...heartbeats].map(t => t.at), [1_234, 1_234, 1_234]);
  });

  it("reports a key press with no process when the hook couldn't tell which one process its keys went to, and a pointer input with none whatever the hook sends", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const inputs: PhysicalInput[] = [];
    backend.physicalInput.onPhysicalInput(t => inputs.push(t));

    await backend.physicalInput.startAsync(HangGuard.signal());
    api.onPhysicalInput?.(1, 0);
    api.onPhysicalInput?.(0, 42);

    assert.deepEqual(inputs.map(t => [t.kind, t.processId]), [[PhysicalInputKind.Keyboard, null], [PhysicalInputKind.Pointer, null]]);
  });

  it("ignores what an earlier run reports after a stop, and reports again after a restart", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const inputs: PhysicalInput[] = [];
    const heartbeats: Heartbeat[] = [];
    backend.physicalInput.onPhysicalInput(t => inputs.push(t));
    backend.physicalInput.onHeartbeat(t => heartbeats.push(t));

    await backend.physicalInput.startAsync(HangGuard.signal());
    const [staleInput, staleHeartbeat] = [api.onPhysicalInput, api.onHeartbeat];
    await backend.physicalInput.stopAsync();
    staleInput?.(0, 0);
    staleHeartbeat?.(1);
    await backend.physicalInput.startAsync(HangGuard.signal());
    staleInput?.(0, 0);
    api.onPhysicalInput?.(1, 42);

    assert.deepEqual(api.named("stopMonitor"), [[]]);
    assert.deepEqual(inputs.map(t => t.kind), [PhysicalInputKind.Keyboard]);
    assert.deepEqual(heartbeats, []);
  });

  it("stops a listener that is disposed", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const inputs: PhysicalInput[] = [];

    await backend.physicalInput.startAsync(HangGuard.signal());
    backend.physicalInput.onPhysicalInput(t => inputs.push(t))[Symbol.dispose]();
    api.onPhysicalInput?.(0, 0);

    assert.deepEqual(inputs, []);
  });

  it("refuses a second start, stops only a running monitor, and starts nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await backend.physicalInput.stopAsync();
    await assert.rejects(backend.physicalInput.startAsync(AbortSignal.abort()), { name: "AbortError" });
    await backend.physicalInput.startAsync(HangGuard.signal());
    const restarting = backend.physicalInput.startAsync(HangGuard.signal());
    await assert.rejects(restarting, MonitorRunningException);
    await assert.rejects(restarting, { message: "The physical input monitor is already running." });

    assert.deepEqual(api.calls.map(t => t.name), ["startMonitor"]);
  });
});
