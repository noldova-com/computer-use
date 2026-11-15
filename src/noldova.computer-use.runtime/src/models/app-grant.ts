/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AppTier } from "./app-tier.ts";
import type { AppIdentity } from "./backend/app-identity.ts";

export class AppGrant {
  public readonly identity: AppIdentity;
  public readonly name: string;
  public readonly scope: string;
  public readonly sessionId: string;
  public readonly tier: AppTier;

  public constructor(scope: string, sessionId: string, identity: AppIdentity, name: string, tier: AppTier) {
    this.identity = identity;
    this.name = name;
    this.scope = scope;
    this.sessionId = sessionId;
    this.tier = tier;
  }
}
