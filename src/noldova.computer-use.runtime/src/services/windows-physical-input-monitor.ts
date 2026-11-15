/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MonitorRunningException } from "../exceptions/monitor-running.exception.ts";
import type { IPhysicalInputMonitor } from "../interfaces/backend/i-physical-input-monitor.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import { Heartbeat } from "../models/backend/heartbeat.ts";
import { PhysicalInput } from "../models/backend/physical-input.ts";
import { PhysicalInputKind } from "../models/backend/physical-input-kind.ts";

export class WindowsPhysicalInputMonitor implements IPhysicalInputMonitor {
  private static readonly kinds: readonly PhysicalInputKind[] = [PhysicalInputKind.Pointer, PhysicalInputKind.Keyboard];

  private readonly api: IWindowsDesktopApi;
  private readonly heartbeatListeners: Set<(heartbeat: Heartbeat) => void> = new Set();
  private readonly inputListeners: Set<(input: PhysicalInput) => void> = new Set();
  private readonly now: () => number;
  private isRunning: boolean = false;
  private run: number = 0;

  public readonly heartbeatIntervalMs: number;

  public constructor(api: IWindowsDesktopApi, heartbeatIntervalMs: number, now: () => number) {
    this.api = api;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.now = now;
  }

  public async startAsync(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (this.isRunning)
      throw new MonitorRunningException();

    this.run += 1;
    const run = this.run;
    this.api.startMonitor((kind, processId) => this.report(run, kind, processId), t => this.beat(run, t), this.heartbeatIntervalMs);
    this.isRunning = true;
  }

  public async stopAsync(): Promise<void> {
    if (!this.isRunning)
      return;

    this.run += 1;
    this.isRunning = false;
    this.api.stopMonitor();
  }

  public onPhysicalInput(listener: (input: PhysicalInput) => void): Disposable {
    return WindowsPhysicalInputMonitor.listen(this.inputListeners, listener);
  }

  public onHeartbeat(listener: (heartbeat: Heartbeat) => void): Disposable {
    return WindowsPhysicalInputMonitor.listen(this.heartbeatListeners, listener);
  }

  private report(run: number, code: number, processId: number): void {
    const kind = WindowsPhysicalInputMonitor.kinds[code];
    if (run !== this.run || kind === undefined)
      return;

    const input = new PhysicalInput(kind, this.now(), kind === PhysicalInputKind.Keyboard && processId > 0 ? processId : null);
    for (const listener of this.inputListeners)
      listener(input);
  }

  private beat(run: number, sequence: number): void {
    if (run !== this.run)
      return;

    const heartbeat = new Heartbeat(sequence, this.now());
    for (const listener of this.heartbeatListeners)
      listener(heartbeat);
  }

  private static listen<T>(listeners: Set<(value: T) => void>, listener: (value: T) => void): Disposable {
    listeners.add(listener);

    return { [Symbol.dispose]: () => listeners.delete(listener) };
  }
}
