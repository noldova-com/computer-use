/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ControlState, SessionStatus } from "@noldova/computer-use.protocol";
import { type EventChannel, type IRuntimePartContext, type Registration, ToolFailureCode, type WorkItem } from "@noldova/desktop.runtime";

import type { IPhysicalInputMonitor } from "../interfaces/backend/i-physical-input-monitor.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import { InputWatch } from "./input-watch.ts";

export class ControlSwitch {
  private readonly context: IRuntimePartContext;
  private readonly onStatus: (status: SessionStatus) => void;
  private readonly registrations: readonly Registration[];
  private readonly status: EventChannel;
  private readonly watch: InputWatch;
  private current: SessionStatus = new SessionStatus(ControlState.Idle, null);
  private holderSessionId: string | null = null;
  private isWatching: boolean = false;
  private work: WorkItem | null = null;

  public constructor(context: IRuntimePartContext, monitor: IPhysicalInputMonitor, onStatus: (status: SessionStatus) => void) {
    this.context = context;
    this.onStatus = onStatus;
    this.status = context.declareEvent(SessionStatus.changedEvent);
    this.watch = new InputWatch(monitor, context.appWindows, () => this.stop(Resources.stopByInput));
    this.registrations = [context.tools.onStopped(() => this.onStopped()), context.tools.onResumed(() => this.onResumed())];
    if (context.tools.isStopped)
      this.publish(new SessionStatus(ControlState.Stopped, null));
  }

  public get currentStatus(): SessionStatus {
    return this.current;
  }

  public enter(context: IToolCallContext): void {
    if (this.holderSessionId === context.sessionId)
      return;

    this.holderSessionId = context.sessionId;
    this.work ??= this.beginWork();
    this.publish(new SessionStatus(ControlState.Controlling, context.sessionId));
  }

  public async watchAsync<T>(signal: AbortSignal, send: () => Promise<T>): Promise<T> {
    if (this.isWatching)
      return await send();

    await this.startWatchAsync(signal);
    this.isWatching = true;
    try {
      return await send();
    } finally {
      this.isWatching = false;
      await this.endWatchAsync();
    }
  }

  public endSession(sessionId: string): void {
    if (this.holderSessionId !== sessionId)
      return;

    this.holderSessionId = null;
    this.endWork();
    this.publish(new SessionStatus(ControlState.Idle, null));
  }

  public stop(reason: string): void {
    this.context.tools.stopAll(reason);
  }

  public async disposeAsync(): Promise<void> {
    for (const registration of this.registrations)
      registration[Symbol.dispose]();
    this.endWork();
    this.publish(new SessionStatus(ControlState.Idle, null));
    this.status[Symbol.dispose]();
    await this.watch.stopAsync();
  }

  private onStopped(): void {
    this.holderSessionId = null;
    void this.watch.stopAsync();
    this.endWork();
    this.publish(new SessionStatus(ControlState.Stopped, null));
  }

  private onResumed(): void {
    this.publish(new SessionStatus(ControlState.Idle, null));
  }

  private async startWatchAsync(signal: AbortSignal): Promise<void> {
    try {
      await this.watch.startAsync(signal);
    } catch (error) {
      if (signal.aborted)
        throw CallFailures.ofAbort(signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.inputWatchFailed);
    }
    if (signal.aborted) {
      await this.endWatchAsync();

      throw CallFailures.ofAbort(signal, false);
    }
  }

  private async endWatchAsync(): Promise<void> {
    try {
      await this.watch.stopAsync();
    } catch (error) {
      if (!BackendFailures.isBackendFailure(error))
        this.context.log.write(Resources.formatWatchStopFailed(String(error)));
    }
  }

  private beginWork(): WorkItem {
    const work = this.context.beginWork(Resources.controlWorkDescription);
    work.signal.addEventListener("abort", () => this.stop(Resources.stopByWork), { once: true });

    return work;
  }

  private endWork(): void {
    const work = this.work;
    this.work = null;
    work?.[Symbol.dispose]();
  }

  private publish(status: SessionStatus): void {
    this.current = status;
    this.status.publish(status.toJson());
    this.onStatus(status);
  }
}
