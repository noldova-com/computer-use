/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  type IModuleLog,
  type IPermissionRequest,
  PermissionCenter,
  PermissionOutcome,
  type RememberedPermission,
  type ToolDescriptor,
  type ToolSession
} from "@noldova/desktop.runtime";

import type { IPermissionIntercept } from "./interfaces/i-permission-intercept.ts";
import type { IPermissionRecord } from "./interfaces/i-permission-record.ts";
import { MemoryPermissionStore } from "./memory-permission-store.fixture.ts";
import { PermissionAnswererDouble } from "./permission-answerer-double.fixture.ts";
import { RecordingModuleLog } from "./recording-module-log.fixture.ts";

export type { IPermissionIntercept } from "./interfaces/i-permission-intercept.ts";

export class RecordingPermissionCenter extends PermissionCenter {
  private readonly recorded: IPermissionRecord[] = [];
  public static readonly appModule: string = "app";
  public readonly appAnswerer: PermissionAnswererDouble = new PermissionAnswererDouble();
  public intercept: IPermissionIntercept | null = null;
  public readonly log: RecordingModuleLog = new RecordingModuleLog();

  public constructor(waitMilliseconds?: number) {
    super(RecordingPermissionCenter.appModule, waitMilliseconds);
    this.open(new MemoryPermissionStore());
    this.registerAnswerer(RecordingPermissionCenter.appModule, this.appAnswerer, this.log);
  }

  public get messages(): readonly string[] {
    return this.log.messages;
  }

  public override async requestAsync(
    moduleId: string,
    descriptor: ToolDescriptor,
    log: IModuleLog,
    session: ToolSession,
    input: IPermissionRequest,
    signal: AbortSignal): Promise<PermissionOutcome> {
    const intercepted = this.intercept?.(input, signal) ?? null;
    const outcome = intercepted === null ? await super.requestAsync(moduleId, descriptor, log, session, input, signal) : new PermissionOutcome(await intercepted);
    this.recorded.push({
      action: input.action,
      decision: outcome.decision,
      details: input.details.map(t => ({ name: t.label, value: t.value })),
      isRemembered: outcome.isRemembered,
      requester: moduleId,
      subject: input.subject ?? null
    });

    return outcome;
  }

  public records(): readonly IPermissionRecord[] {
    return [...this.recorded];
  }

  public remembered(): readonly RememberedPermission[] {
    return this.listRemembered(RecordingPermissionCenter.appModule);
  }

  public forget(answer: RememberedPermission): void {
    this.revoke(RecordingPermissionCenter.appModule, answer.id);
  }
}
