/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PermissionDecision } from "@noldova/desktop.runtime";

export interface IPermissionRecord {
  readonly action: string;
  readonly decision: PermissionDecision;
  readonly details: readonly { readonly name: string; readonly value: string }[];
  readonly isRemembered: boolean;
  readonly requester: string;
  readonly subject: string | null;
}
