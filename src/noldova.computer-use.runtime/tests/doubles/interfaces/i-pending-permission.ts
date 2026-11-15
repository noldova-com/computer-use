/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPermissionRequest } from "@noldova/desktop.runtime";

export interface IPendingPermission {
  readonly id: string;
  readonly request: IPermissionRequest;
  readonly requester: string;
  readonly scope: string;
  readonly session: string;
  readonly signal: AbortSignal;
}
