/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ProcessStartException } from "@noldova/desktop.runtime";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IMacSignatureReader } from "../interfaces/i-mac-signature-reader.ts";
import { AppDescription } from "../models/backend/app-description.ts";
import { AppIdentity } from "../models/backend/app-identity.ts";
import { AppInfo } from "../models/backend/app-info.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacAppBackend implements IAppBackend {
  private readonly api: MacDesktopApi;
  private readonly hostPath: string;
  private readonly signatures: IMacSignatureReader;

  public constructor(api: MacDesktopApi, signatures: IMacSignatureReader, hostPath: string) {
    this.api = api;
    this.hostPath = hostPath;
    this.signatures = signatures;
  }

  public async listAppsAsync(signal: AbortSignal): Promise<readonly AppInfo[]> {
    signal.throwIfAborted();
    const list = await this.api.listAppsAsync(this.hostPath);
    const running = new Set(list.running.map(t => AppIdentity.ofMacBundleId(t.bundleId).id));
    const host = list.host === "" ? null : AppIdentity.ofMacBundleId(list.host).id;
    const apps = new Map<string, AppInfo>();
    for (const app of [...list.running, ...list.installed]) {
      const identity = AppIdentity.ofMacBundleId(app.bundleId);
      if (!apps.has(identity.id))
        apps.set(identity.id, BackendAnswers.read(Resources.macScriptMethods.listApps, app, () => new AppInfo(identity, app.name, null, running.has(identity.id), identity.id === host)));
    }

    return [...apps.values()];
  }

  public async describeAppAsync(identity: AppIdentity, iconSize: number, signal: AbortSignal): Promise<AppDescription | null> {
    signal.throwIfAborted();
    const app = await this.api.describeBundleAsync(identity.id, iconSize);
    signal.throwIfAborted();
    if (app === null)
      return null;
    const publisher = await this.readPublisherAsync(app.path, signal);

    return BackendAnswers.read(Resources.macScriptMethods.describeBundle, app,
      () => new AppDescription(identity, app.name, publisher, app.icon === null ? null : new Uint8Array(Buffer.from(app.icon, Resources.base64Encoding))));
  }

  private async readPublisherAsync(bundlePath: string, signal: AbortSignal): Promise<string | null> {
    try {
      return await this.signatures.readSignerAsync(bundlePath, signal);
    } catch (error) {
      signal.throwIfAborted();
      if (!(error instanceof ProcessStartException))
        throw error;

      return null;
    }
  }
}
