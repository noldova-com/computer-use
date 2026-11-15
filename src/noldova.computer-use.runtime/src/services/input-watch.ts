/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import timers from "node:timers/promises";

import type { IAppWindows } from "@noldova/desktop.runtime";

import type { IPhysicalInputMonitor } from "../interfaces/backend/i-physical-input-monitor.ts";
import type { PhysicalInput } from "../models/backend/physical-input.ts";
import { PhysicalInputKind } from "../models/backend/physical-input-kind.ts";
import { Resources } from "../resources.ts";

export class InputWatch {
  private readonly appWindows: IAppWindows;
  private readonly monitor: IPhysicalInputMonitor;
  private readonly onTakeover: () => void;
  private deadline: AbortController = new AbortController();
  private run: AbortController | null = null;
  private starting: Promise<void> = Promise.resolve();
  private stopped: Promise<void> = Promise.resolve();
  private subscriptions: readonly Disposable[] = [];

  public constructor(monitor: IPhysicalInputMonitor, appWindows: IAppWindows, onTakeover: () => void) {
    this.appWindows = appWindows;
    this.monitor = monitor;
    this.onTakeover = onTakeover;
  }

  public async startAsync(signal: AbortSignal): Promise<void> {
    const started = this.startRunAsync(signal);
    this.starting = started.catch(() => undefined);
    await started;
  }

  public stopAsync(): Promise<void> {
    this.endRun();
    const stopped = this.starting.then(async () => {
      this.endRun();
      await this.stopped;
    });
    stopped.catch(() => undefined);

    return stopped;
  }

  private async startRunAsync(signal: AbortSignal): Promise<void> {
    await this.stopped;
    const run = new AbortController();
    this.subscriptions = [
      this.monitor.onPhysicalInput(t => this.judge(run, t)),
      this.monitor.onHeartbeat(() => this.armDeadline(run))
    ];
    try {
      await this.monitor.startAsync(signal);
    } catch (error) {
      this.dispose();

      throw error;
    }
    this.run = run;
    this.armDeadline(run);
  }

  private endRun(): void {
    const run = this.run;
    if (run === null)
      return;

    this.run = null;
    run.abort();
    this.deadline.abort();
    this.dispose();
    const stopped = this.stopped.then(() => this.monitor.stopAsync());
    stopped.catch(() => undefined);
    this.stopped = stopped;
  }

  private armDeadline(run: AbortController): void {
    if (run !== this.run)
      return;

    this.deadline.abort();
    const deadline = new AbortController();
    this.deadline = deadline;
    void timers.setTimeout(this.monitor.heartbeatIntervalMs * Resources.missedBeatsToStop, undefined, { ref: false, signal: deadline.signal })
      .then(() => this.onTakeover(), () => undefined);
  }

  private judge(run: AbortController, input: PhysicalInput): void {
    if (run !== this.run)
      return;

    const processId = input.processId;
    if (input.kind !== PhysicalInputKind.Keyboard || processId === null || !this.appWindows.list().some(t => t.processId === processId))
      this.onTakeover();
  }

  private dispose(): void {
    for (const subscription of this.subscriptions)
      subscription[Symbol.dispose]();
    this.subscriptions = [];
  }
}
