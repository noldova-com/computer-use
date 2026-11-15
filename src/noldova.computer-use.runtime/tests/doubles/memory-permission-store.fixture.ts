/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type PermissionDecision, RememberedPermission } from "@noldova/desktop.runtime";

export class MemoryPermissionStore {
  private readonly answers: RememberedPermission[] = [];
  private nextId: number = 1;

  public find(module: string, action: string, subject: string | null, scope: string): PermissionDecision | null {
    return this.answers.find(t => MemoryPermissionStore.matches(t, module, action, subject, scope))?.decision ?? null;
  }

  public remember(module: string, action: string, subject: string | null, scope: string, decision: PermissionDecision): void {
    const index = this.answers.findIndex(t => MemoryPermissionStore.matches(t, module, action, subject, scope));
    if (index >= 0)
      this.answers.splice(index, 1);
    this.answers.push(new RememberedPermission(`answer-${this.nextId++}`, module, action, subject, scope, decision, new Date()));
  }

  public list(): readonly RememberedPermission[] {
    return [...this.answers];
  }

  public forget(id: string): RememberedPermission | null {
    const index = this.answers.findIndex(t => t.id === id);

    return index < 0 ? null : this.answers.splice(index, 1)[0] ?? null;
  }

  private static matches(answer: RememberedPermission, module: string, action: string, subject: string | null, scope: string): boolean {
    return answer.module === module && answer.action === action && answer.subject === subject && answer.scope === scope;
  }
}
