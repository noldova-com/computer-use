/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Heartbeat, MonitorRunningException, PhysicalInput } from "@noldova/computer-use.runtime";
import type { IPhysicalInputMonitor, PhysicalInputKind } from "@noldova/computer-use.runtime";

export class PhysicalInputMonitorDouble implements IPhysicalInputMonitor {
  private readonly heartbeatListeners: Set<(heartbeat: Heartbeat) => void> = new Set();
  private readonly inputListeners: Set<(input: PhysicalInput) => void> = new Set();
  private readonly now: () => number;
  private sequence: number = 0;

  public readonly heartbeatIntervalMs: number;
  public isRunning: boolean = false;
  public stopFailure: Error | null = null;

  public constructor(heartbeatIntervalMs: number, now: () => number) {
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.now = now;
  }

  public async startAsync(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (this.isRunning)
      throw new MonitorRunningException();

    this.isRunning = true;
    this.beat();
  }

  public async stopAsync(): Promise<void> {
    if (this.stopFailure !== null)
      throw this.stopFailure;

    this.isRunning = false;
  }

  public onPhysicalInput(listener: (input: PhysicalInput) => void): Disposable {
    return PhysicalInputMonitorDouble.listen(this.inputListeners, listener);
  }

  public onHeartbeat(listener: (heartbeat: Heartbeat) => void): Disposable {
    return PhysicalInputMonitorDouble.listen(this.heartbeatListeners, listener);
  }

  public beat(): void {
    if (!this.isRunning)
      return;

    this.sequence += 1;
    const heartbeat = new Heartbeat(this.sequence, this.now());
    for (const listener of this.heartbeatListeners)
      listener(heartbeat);
  }

  public report(kind: PhysicalInputKind, processId: number | null = null): void {
    if (!this.isRunning)
      return;

    const input = new PhysicalInput(kind, this.now(), processId);
    for (const listener of this.inputListeners)
      listener(input);
  }

  private static listen<T>(listeners: Set<(value: T) => void>, listener: (value: T) => void): Disposable {
    listeners.add(listener);

    return { [Symbol.dispose]: () => listeners.delete(listener) };
  }
}
