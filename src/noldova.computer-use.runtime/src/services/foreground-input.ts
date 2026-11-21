/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IPermissionRequest, PermissionDecision, PermissionDetailKind, PermissionOption, ToolFailureCode, ToolRisk } from "@noldova/desktop.runtime";

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { AppGrant } from "../models/app-grant.ts";
import type { AppTier } from "../models/app-tier.ts";
import type { AppIdentity } from "../models/backend/app-identity.ts";
import type { DesktopPoint } from "../models/backend/desktop-point.ts";
import type { DesktopRect } from "../models/backend/desktop-rect.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import type { WindowStack } from "../models/backend/window-stack.ts";
import type { GrantRecord } from "../models/grant-record.ts";
import type { InputKind } from "../models/input-kind.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import type { ControlSwitch } from "./control-switch.ts";
import type { RememberedGrants } from "./remembered-grants.ts";

export class ForegroundInput {
  private readonly control: ControlSwitch;
  private readonly grants: RememberedGrants;
  private readonly record: GrantRecord;
  private readonly windows: IWindowBackend;

  public constructor(windows: IWindowBackend, record: GrantRecord, grants: RememberedGrants, control: ControlSwitch) {
    this.control = control;
    this.grants = grants;
    this.record = record;
    this.windows = windows;
  }

  public async targetAsync(kind: InputKind, context: IToolCallContext, checkTier: (tier: AppTier, window: WindowInfo) => void = () => undefined): Promise<WindowInfo> {
    const window = await this.frontAsync(context);
    const grant = this.grantOf(window, context);
    if (!grant.tier.allows(kind))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatTierDisallows(window.appName, grant.tier.value, kind.inputName));
    checkTier(grant.tier, window);

    return window;
  }

  public async readableAsync(context: IToolCallContext): Promise<WindowInfo> {
    const window = await this.frontAsync(context);
    if (!await this.isReadableAsync(window.app, context))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatAppNotGranted(window.appName));

    return window;
  }

  public async isReadableAsync(app: AppIdentity, context: IToolCallContext): Promise<boolean> {
    const grant = this.record.find(context.scope, context.sessionId, app);
    if (grant === undefined)
      return false;
    const isRemembered = await this.grants.isRememberedAsync(grant, context);
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);

    return isRemembered;
  }

  public async checkPointsAsync(window: WindowInfo, points: readonly DesktopPoint[], context: IToolCallContext): Promise<void> {
    let stack: WindowStack;
    try {
      stack = await this.windows.listStackAsync(context.signal);
    } catch (error) {
      if (context.signal.aborted)
        throw CallFailures.ofAbort(context.signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.windowStackFailed);
    }
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);

    for (const point of points) {
      const app = stack.windows.find(t => ForegroundInput.contains(t.frame, point))?.app ?? null;
      if (app === null)
        throw CallFailures.of(ToolFailureCode.Refused, Resources.pointOverNoApp);
      if (app.id !== window.app.id)
        throw CallFailures.of(ToolFailureCode.Refused, Resources.formatPointOverOtherApp(app.id, window.appName));
    }
  }

  public async askAppAsync(window: WindowInfo, kind: InputKind, input: readonly PermissionDetail[], summary: string | null, context: IToolCallContext): Promise<void> {
    await this.askAsync({
      action: Resources.controlAppAction,
      subject: window.app.id,
      title: Resources.inputTitle,
      details: [new PermissionDetail(Resources.inputDetailName, kind.inputName), ...input, ...ForegroundInput.appDetails(window, summary)],
      risk: ToolRisk.Medium,
      options: [PermissionOption.AllowOnce, PermissionOption.Deny],
      isRememberedOnly: true
    }, context);
  }

  public async askPersonAsync(action: string, title: string, window: WindowInfo, input: readonly PermissionDetail[], summary: string, context: IToolCallContext): Promise<void> {
    await this.askAsync({
      action,
      subject: window.app.id,
      title,
      details: [...input, ...ForegroundInput.appDetails(window, summary)],
      risk: ToolRisk.High,
      options: [PermissionOption.AllowOnce, PermissionOption.Deny]
    }, context);
  }

  public async watchAsync<T>(context: IToolCallContext, send: () => Promise<T>): Promise<T> {
    return await this.control.watchAsync(context.signal, send);
  }

  public async sendOnceAsync(context: IToolCallContext, send: () => Promise<void>): Promise<void> {
    await this.watchAsync(context, async () => {
      ForegroundInput.markSending(context);
      try {
        await send();
      } catch (error) {
        if (error instanceof RefusalException)
          throw CallFailures.ofRefusal(error, false);
        if (!context.signal.aborted && !BackendFailures.isBackendFailure(error))
          throw error;

        throw CallFailures.ofBackendFailure(context.signal, false, error);
      }
      if (context.signal.aborted)
        throw CallFailures.ofAbort(context.signal, true);
    });
  }

  public static markSending(context: IToolCallContext): void {
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);
    context.markSending();
  }

  private async askAsync(request: IPermissionRequest, context: IToolCallContext): Promise<void> {
    const outcome = await context.requestPermissionAsync(request);
    if (outcome.isAllowed)
      return;
    if (outcome.decision === PermissionDecision.Expired)
      throw CallFailures.of(ToolFailureCode.Expired, Resources.inputRequestExpired);
    if (outcome.decision !== PermissionDecision.Withdrawn)
      throw CallFailures.of(ToolFailureCode.Denied, Resources.inputDenied);
    if (context.signal.aborted)
      throw CallFailures.ofAbortWhileRequestWaits(context.signal);

    throw CallFailures.of(ToolFailureCode.Withdrawn, Resources.inputRequestWithdrawn);
  }

  private async frontAsync(context: IToolCallContext): Promise<WindowInfo> {
    let window: WindowInfo | null;
    try {
      window = await this.windows.getForegroundWindowAsync(context.signal);
    } catch (error) {
      if (context.signal.aborted)
        throw CallFailures.ofAbort(context.signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.foregroundWindowFailed);
    }
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);
    if (window === null)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.noForegroundWindow);
    if (window.isElevated)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.refusalElevatedTarget);

    return window;
  }

  private grantOf(window: WindowInfo, context: IToolCallContext): AppGrant {
    const grant = this.record.find(context.scope, context.sessionId, window.app);
    if (grant === undefined)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatAppNotGranted(window.appName));

    return grant;
  }

  private static contains(frame: DesktopRect, point: DesktopPoint): boolean {
    return point.x >= frame.x && point.y >= frame.y && point.x < frame.x + frame.width && point.y < frame.y + frame.height;
  }

  private static appDetails(window: WindowInfo, summary: string | null): readonly PermissionDetail[] {
    return [
      new PermissionDetail(Resources.appDetailName, window.appName),
      new PermissionDetail(Resources.identityDetailName, window.app.id),
      ...(summary === null ? [] : [new PermissionDetail(Resources.summaryDetailName, summary, PermissionDetailKind.AgentText)])
    ];
  }
}
