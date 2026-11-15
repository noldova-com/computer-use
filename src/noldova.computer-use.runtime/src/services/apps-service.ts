/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import timers from "node:timers/promises";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { AppDescription } from "../models/backend/app-description.ts";
import { AppIdentity } from "../models/backend/app-identity.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";

export class AppsService {
  public static readonly iconSize: number = Resources.appIconSize;
  private readonly backendOf: () => IAppBackend | null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly write: (line: string) => void;

  public constructor(backendOf: () => IAppBackend | null, write: (line: string) => void) {
    this.backendOf = backendOf;
    this.write = write;
  }

  public async describeAsync(identity: string, signal: AbortSignal): Promise<AppDescription | null> {
    signal.throwIfAborted();
    if (this.backendOf() === null || identity.trim() === "")
      return null;

    const { promise: left, reject } = Promise.withResolvers<never>();
    const leave = (): void => reject(signal.reason);
    signal.addEventListener("abort", leave, { once: true });
    const limit = new AbortController();
    const timer = new AbortController();
    const read = this.queue.then(async () => await this.readAsync(identity, signal, limit, timer.signal));
    this.queue = Promise.allSettled([read]);
    try {
      return await Promise.race([this.answerAsync(read, signal, limit.signal), left]);
    } finally {
      signal.removeEventListener("abort", leave);
      timer.abort();
    }
  }

  private async readAsync(identity: string, signal: AbortSignal, limit: AbortController, timer: AbortSignal): Promise<AppDescription | null> {
    const backend = this.backendOf();
    if (signal.aborted || backend === null)
      return null;

    void timers.setTimeout(Resources.describeAppTimeoutMs, undefined, { ref: false, signal: timer }).then(() => limit.abort(), () => undefined);

    return await backend.describeAppAsync(new AppIdentity(identity), AppsService.iconSize, AbortSignal.any([signal, limit.signal]));
  }

  private async answerAsync(read: Promise<AppDescription | null>, signal: AbortSignal, limit: AbortSignal): Promise<AppDescription | null> {
    const { promise: ended, reject } = Promise.withResolvers<never>();
    const stop = (): void => reject(limit.reason);
    limit.addEventListener("abort", stop, { once: true });
    let description: AppDescription | null = null;
    try {
      description = await Promise.race([read, ended]);
    } catch (error) {
      signal.throwIfAborted();
      if (limit.aborted)
        this.write(Resources.describeAppTimedOut);
      else if (BackendFailures.isBackendFailure(error))
        this.write(Resources.formatDescribeAppFailed(error.name));
      else
        throw error;
    } finally {
      limit.removeEventListener("abort", stop);
    }

    return description;
  }
}
