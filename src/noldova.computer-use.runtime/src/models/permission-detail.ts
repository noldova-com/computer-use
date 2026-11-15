/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IPermissionDetail, PermissionDetailKind } from "@noldova/desktop.runtime";

export class PermissionDetail implements IPermissionDetail {
  public readonly kind: PermissionDetailKind;
  public readonly label: string;
  public readonly value: string;

  public constructor(label: string, value: string, kind: PermissionDetailKind = PermissionDetailKind.Text) {
    this.kind = kind;
    this.label = label;
    this.value = value;
  }
}
