/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPermissionRequest, PermissionDecision } from "@noldova/desktop.runtime";

export interface IPermissionIntercept {
  (request: IPermissionRequest, signal: AbortSignal): Promise<PermissionDecision> | null;
}
