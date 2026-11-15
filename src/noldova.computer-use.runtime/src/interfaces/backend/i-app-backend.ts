/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AppDescription } from "../../models/backend/app-description.ts";
import type { AppIdentity } from "../../models/backend/app-identity.ts";
import type { AppInfo } from "../../models/backend/app-info.ts";

export interface IAppBackend {
  listAppsAsync(signal: AbortSignal): Promise<readonly AppInfo[]>;
  describeAppAsync(identity: AppIdentity, iconSize: number, signal: AbortSignal): Promise<AppDescription | null>;
}
