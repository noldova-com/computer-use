/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonValue } from "@noldova/computer-use.protocol";
import { PermissionDecision, PermissionDetailKind, PermissionOption, ToolFailureCode, ToolRisk } from "@noldova/desktop.runtime";

import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ScreenHold } from "../models/screen-hold.ts";
import { Resources } from "../resources.ts";
import { CallFailures } from "./call-failures.ts";

export class ScreenSessionGate {
  private readonly hold: ScreenHold = new ScreenHold();

  public ensureFree(context: IToolCallContext): void {
    if (!this.hold.isFree() && !this.hold.isHeldBy(context.scope))
      throw CallFailures.of(ToolFailureCode.Unavailable, Resources.screenBusy);
  }

  public async ensureGrantedAsync(toolName: string, input: JsonValue, context: IToolCallContext): Promise<void> {
    this.ensureFree(context);
    if (this.hold.isGrantedTo(context.sessionId))
      return;

    this.hold.claim(context.scope, context.sessionId);
    const outcome = await context.requestPermissionAsync({
      action: Resources.controlScreenAction,
      subject: Resources.screenSubject,
      title: Resources.controlScreenTitle,
      details: [new PermissionDetail(Resources.toolDetailName, toolName), new PermissionDetail(Resources.argumentsDetailName, ScreenSessionGate.argumentsOf(input), PermissionDetailKind.Code)],
      risk: ToolRisk.High,
      options: [PermissionOption.AllowOnce, PermissionOption.AllowAlways, PermissionOption.Deny]
    });
    if (outcome.isAllowed) {
      this.hold.grant(context.sessionId);

      return;
    }

    this.hold.leave(context.sessionId);
    if (outcome.decision === PermissionDecision.Expired)
      throw CallFailures.of(ToolFailureCode.Expired, Resources.screenRequestExpired);
    if (outcome.decision !== PermissionDecision.Withdrawn)
      throw CallFailures.of(ToolFailureCode.Denied, Resources.screenDenied);
    if (context.signal.aborted)
      throw CallFailures.ofAbortWhileRequestWaits(context.signal);

    throw CallFailures.of(ToolFailureCode.Withdrawn, Resources.screenRequestWithdrawn);
  }

  public endSession(sessionId: string): void {
    this.hold.leave(sessionId);
  }

  private static argumentsOf(input: JsonValue): string {
    const text = JSON.stringify(input);
    const characters = Array.from(text);

    return characters.length > Resources.maxArgumentsDetailLength ? `${characters.slice(0, Resources.maxArgumentsDetailLength).join("")}${Resources.cutMark}` : text;
  }
}
