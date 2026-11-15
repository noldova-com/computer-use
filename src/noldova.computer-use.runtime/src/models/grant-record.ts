/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AppGrant } from "./app-grant.ts";
import type { AppIdentity } from "./backend/app-identity.ts";

export class GrantRecord {
  private readonly grants: Map<string, AppGrant> = new Map();

  public add(grant: AppGrant): void {
    this.grants.set(GrantRecord.keyOf(grant.scope, grant.identity), grant);
  }

  public find(scope: string, identity: AppIdentity): AppGrant | undefined {
    return this.grants.get(GrantRecord.keyOf(scope, identity));
  }

  public removeSession(sessionId: string): void {
    for (const [key, grant] of this.grants)
      if (grant.sessionId === sessionId)
        this.grants.delete(key);
  }

  private static keyOf(scope: string, identity: AppIdentity): string {
    return JSON.stringify([scope, identity.id]);
  }
}
