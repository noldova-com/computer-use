/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ToolFailureCode } from "@noldova/desktop.runtime";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { AppInfo } from "../models/backend/app-info.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";

export class AppListing {
  public static async listAsync(backend: IAppBackend, signal: AbortSignal, failedMessage: string): Promise<readonly AppInfo[]> {
    let apps: readonly AppInfo[];
    try {
      apps = await backend.listAppsAsync(signal);
    } catch (error) {
      if (signal.aborted)
        throw CallFailures.ofAbort(signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, failedMessage);
    }
    if (signal.aborted)
      throw CallFailures.ofAbort(signal, false);

    return apps;
  }
}
