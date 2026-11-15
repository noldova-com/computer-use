/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPermissionRequest, PermissionOutcome } from "@noldova/desktop.runtime";

export interface IToolCallContext {
  readonly scope: string;
  readonly sessionId: string;
  readonly signal: AbortSignal;
  requestPermissionAsync(request: IPermissionRequest): Promise<PermissionOutcome>;
  markSending(): void;
}
