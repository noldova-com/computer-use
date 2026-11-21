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
  private readonly grants: Map<string, { readonly grant: AppGrant; readonly sessionIds: Set<string> }> = new Map();

  public add(grant: AppGrant): void {
    const key = GrantRecord.keyOf(grant.scope, grant.identity);
    const sessionIds = this.grants.get(key)?.sessionIds ?? new Set<string>();
    sessionIds.add(grant.sessionId);
    this.grants.set(key, { grant, sessionIds });
  }

  public find(scope: string, sessionId: string, identity: AppIdentity): AppGrant | undefined {
    const held = this.grants.get(GrantRecord.keyOf(scope, identity));

    return held?.sessionIds.has(sessionId) === true ? held.grant : undefined;
  }

  public removeSession(sessionId: string): void {
    for (const [key, held] of this.grants) {
      held.sessionIds.delete(sessionId);
      if (held.sessionIds.size === 0)
        this.grants.delete(key);
    }
  }

  private static keyOf(scope: string, identity: AppIdentity): string {
    return JSON.stringify([scope, identity.id]);
  }
}
