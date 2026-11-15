/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IPermissionAnswerer, PermissionDecision, PermissionOption, type PermissionQuestion } from "@noldova/desktop.runtime";

import type { IPendingPermission } from "./interfaces/i-pending-permission.ts";

export class PermissionAnswererDouble implements IPermissionAnswerer {
  private static readonly DECISIONS: ReadonlyMap<PermissionOption, PermissionDecision> = new Map([
    [PermissionOption.AllowOnce, PermissionDecision.AllowedOnce],
    [PermissionOption.AllowAlways, PermissionDecision.AllowedAlways],
    [PermissionOption.Deny, PermissionDecision.Denied],
    [PermissionOption.DenyAlways, PermissionDecision.DeniedAlways]
  ]);

  private readonly answers: Map<string, (decision: PermissionDecision) => void> = new Map();
  private readonly received: IPendingPermission[] = [];
  private readonly unread: IPendingPermission[] = [];
  private readonly waiters: ((pending: IPendingPermission) => void)[] = [];
  private nextId: number = 1;

  public answerAsync(question: PermissionQuestion, signal: AbortSignal): Promise<PermissionDecision> {
    const pending: IPendingPermission = {
      id: `request-${this.nextId++}`,
      request: question.request,
      requester: question.module,
      scope: question.scope,
      session: question.session,
      signal
    };

    return new Promise(resolve => {
      this.answers.set(pending.id, resolve);
      signal.addEventListener("abort", () => this.answers.delete(pending.id), { once: true });
      this.deliver(pending);
    });
  }

  public answer(id: string, option: PermissionOption): void {
    const resolve = this.answers.get(id);
    const decision = PermissionAnswererDouble.DECISIONS.get(option);
    if (resolve === undefined || decision === undefined)
      throw new Error(`The request ${id} isn't waiting for an answer.`);

    this.answers.delete(id);
    resolve(decision);
  }

  public delivered(): readonly IPendingPermission[] {
    return [...this.received];
  }

  public async nextAsync(): Promise<IPendingPermission> {
    const pending = this.unread.shift();
    if (pending !== undefined)
      return pending;

    return await new Promise<IPendingPermission>(t => this.waiters.push(t));
  }

  private deliver(pending: IPendingPermission): void {
    this.received.push(pending);

    const waiter = this.waiters.shift();
    if (waiter === undefined)
      this.unread.push(pending);
    else
      waiter(pending);
  }
}
