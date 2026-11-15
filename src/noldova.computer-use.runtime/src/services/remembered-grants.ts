/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PermissionOption, ToolRisk } from "@noldova/desktop.runtime";

import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { AppGrant } from "../models/app-grant.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { Resources } from "../resources.ts";

export class RememberedGrants {
  public async isRememberedAsync(grant: AppGrant, context: IToolCallContext): Promise<boolean> {
    const outcome = await context.requestPermissionAsync({
      action: Resources.controlAppAction,
      subject: grant.identity.id,
      title: Resources.controlAppTitle,
      details: [new PermissionDetail(Resources.appDetailName, grant.name), new PermissionDetail(Resources.identityDetailName, grant.identity.id)],
      risk: ToolRisk.Medium,
      options: [PermissionOption.AllowOnce, PermissionOption.Deny],
      isRememberedOnly: true
    });

    return outcome.isAllowed;
  }
}
