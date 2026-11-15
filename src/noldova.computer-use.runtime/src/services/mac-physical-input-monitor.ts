/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IModuleLog } from "@noldova/desktop.runtime";

import { MonitorRunningException } from "../exceptions/monitor-running.exception.ts";
import type { IPhysicalInputMonitor } from "../interfaces/backend/i-physical-input-monitor.ts";
import { Heartbeat } from "../models/backend/heartbeat.ts";
import { PhysicalInput } from "../models/backend/physical-input.ts";
import { PhysicalInputKind } from "../models/backend/physical-input-kind.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacPhysicalInputMonitor implements IPhysicalInputMonitor {
  private readonly api: MacDesktopApi;
  private readonly heartbeatListeners: Set<(heartbeat: Heartbeat) => void> = new Set();
  private readonly inputListeners: Set<(input: PhysicalInput) => void> = new Set();
  private readonly log: IModuleLog;
  private readonly now: () => number;
  private isPolling: boolean = false;
  private polling: Promise<void> = Promise.resolve();
  private run: number = 0;
  private sequence: number = 0;
  private timer: NodeJS.Timeout | null = null;

  public readonly heartbeatIntervalMs: number;

  public constructor(api: MacDesktopApi, heartbeatIntervalMs: number, now: () => number, log: IModuleLog) {
    this.api = api;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.log = log;
    this.now = now;
  }

  public async startAsync(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (this.timer !== null)
      throw new MonitorRunningException();

    this.run += 1;
    const run = this.run;
    await this.api.startWatchAsync();
    this.timer = setInterval(() => this.poll(run), this.heartbeatIntervalMs).unref();
  }

  public async stopAsync(): Promise<void> {
    if (this.timer === null)
      return;

    this.run += 1;
    clearInterval(this.timer);
    this.timer = null;
    await this.api.stopWatchAsync();
    await this.polling;
  }

  public onPhysicalInput(listener: (input: PhysicalInput) => void): Disposable {
    return MacPhysicalInputMonitor.listen(this.inputListeners, listener);
  }

  public onHeartbeat(listener: (heartbeat: Heartbeat) => void): Disposable {
    return MacPhysicalInputMonitor.listen(this.heartbeatListeners, listener);
  }

  private poll(run: number): void {
    if (this.isPolling)
      return;

    this.isPolling = true;
    this.polling = this.pollAsync(run).finally(() => {
      this.isPolling = false;
    });
  }

  private async pollAsync(run: number): Promise<void> {
    try {
      const hasMoved = await this.api.pollWatchAsync();
      if (run !== this.run)
        return;
      if (hasMoved) {
        const input = new PhysicalInput(PhysicalInputKind.Pointer, this.now(), null);
        for (const listener of this.inputListeners)
          listener(input);
      }
      this.sequence += 1;
      const heartbeat = new Heartbeat(this.sequence, this.now());
      for (const listener of this.heartbeatListeners)
        listener(heartbeat);
    } catch (error) {
      if (!BackendFailures.isBackendFailure(error))
        this.log.write(Resources.formatMacWatchPollFailed(String(error)));
    }
  }

  private static listen<T>(listeners: Set<(value: T) => void>, listener: (value: T) => void): Disposable {
    listeners.add(listener);

    return { [Symbol.dispose]: () => listeners.delete(listener) };
  }
}
