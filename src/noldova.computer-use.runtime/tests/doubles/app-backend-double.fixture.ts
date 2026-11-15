/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AppDescription, AppIdentity, AppInfo, IAppBackend } from "@noldova/computer-use.runtime";

export class AppBackendDouble implements IAppBackend {
  private readonly describeWaiters: (() => void)[] = [];
  public apps: readonly AppInfo[];
  public descriptions: ReadonlyMap<string, AppDescription> = new Map();
  public describeWait: Promise<void> | null = null;
  public readonly described: { readonly identity: string; readonly iconSize: number }[] = [];
  public failure: unknown;
  public readonly signals: AbortSignal[] = [];

  public constructor(apps: readonly AppInfo[], failure?: unknown) {
    this.apps = apps;
    this.failure = failure;
  }

  public async listAppsAsync(signal: AbortSignal): Promise<readonly AppInfo[]> {
    this.signals.push(signal);
    if (this.failure !== undefined)
      throw this.failure;

    return this.apps;
  }

  public async describeAppAsync(identity: AppIdentity, iconSize: number, signal: AbortSignal): Promise<AppDescription | null> {
    this.described.push({ identity: identity.id, iconSize });
    this.signals.push(signal);
    for (const reached of this.describeWaiters.splice(0))
      reached();
    await this.describeWait;
    if (this.failure !== undefined)
      throw this.failure;

    return this.descriptions.get(identity.id) ?? null;
  }

  public nextDescribedAsync(): Promise<void> {
    return new Promise(resolve => this.describeWaiters.push(resolve));
  }
}
