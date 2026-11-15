/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, PermissionDecision, PermissionDetailKind, PermissionOption, ToolFailureCode, ToolResult, ToolRisk } from "@noldova/desktop.runtime";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { AppGrant } from "../models/app-grant.ts";
import { AppRequestOutcome } from "../models/app-request-outcome.ts";
import type { AppTier } from "../models/app-tier.ts";
import type { AppInfo } from "../models/backend/app-info.ts";
import type { GrantRecord } from "../models/grant-record.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { AppListing } from "./app-listing.ts";
import { CallFailures } from "./call-failures.ts";
import type { TierPolicy } from "./tier-policy.ts";

export class RequestAppsTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.request(
    Resources.requestAppsName,
    Resources.requestAppsDescription,
    Resources.requestAppsInputSchema,
    Resources.requestAppsOutputSchema
  );
  private readonly backend: IAppBackend;
  private readonly policy: TierPolicy;
  private readonly record: GrantRecord;

  public constructor(backend: IAppBackend, policy: TierPolicy, record: GrantRecord) {
    this.backend = backend;
    this.policy = policy;
    this.record = record;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const identities = RequestAppsTool.identitiesOf(input);
    const reason = RequestAppsTool.reasonOf(input);

    const apps = await AppListing.listAsync(this.backend, context.signal, Resources.requestAppsFailed);
    const results: JsonObject[] = [];
    for (const identity of identities)
      results.push(await this.requestOneAsync(identity, apps, reason, context));

    return new ToolResult([], { [Resources.appsField]: results });
  }

  private async requestOneAsync(identity: string, apps: readonly AppInfo[], reason: string, context: IToolCallContext): Promise<JsonObject> {
    const app = apps.find(t => t.identity.id === identity);
    if (app === undefined)
      return RequestAppsTool.resultOf(identity, AppRequestOutcome.NotFound, null);
    const tier = this.policy.tierOf(app);
    if (tier === null)
      return RequestAppsTool.resultOf(identity, AppRequestOutcome.NeverGrantable, null);

    const outcome = await this.requestAsync(app, tier, reason, context);

    return RequestAppsTool.resultOf(identity, outcome, outcome.isGranted ? tier : null);
  }

  private async requestAsync(app: AppInfo, tier: AppTier, reason: string, context: IToolCallContext): Promise<AppRequestOutcome> {
    const isBroadReach = this.policy.isBroadReach(app);
    const details = [
      new PermissionDetail(Resources.appDetailName, app.name),
      new PermissionDetail(Resources.identityDetailName, app.identity.id),
      new PermissionDetail(Resources.publisherDetailName, app.publisher ?? Resources.noPublisher),
      new PermissionDetail(Resources.tierDetailName, tier.value),
      new PermissionDetail(Resources.reasonDetailName, reason, PermissionDetailKind.AgentText),
      ...(isBroadReach ? [new PermissionDetail(Resources.broadReachWarningDetailName, Resources.broadReachWarning)] : [])
    ];
    const outcome = await context.requestPermissionAsync({
      action: Resources.controlAppAction,
      subject: app.identity.id,
      title: Resources.controlAppTitle,
      details,
      risk: isBroadReach ? ToolRisk.High : ToolRisk.Medium,
      options: [PermissionOption.AllowAlways, PermissionOption.Deny]
    });
    if (outcome.isAllowed) {
      this.record.add(new AppGrant(context.scope, context.sessionId, app.identity, app.name, tier));

      return AppRequestOutcome.Granted;
    }
    if (outcome.decision === PermissionDecision.Expired)
      return AppRequestOutcome.Expired;
    if (outcome.decision !== PermissionDecision.Withdrawn)
      return AppRequestOutcome.Denied;
    if (context.signal.aborted)
      throw CallFailures.ofAbortWhileRequestWaits(context.signal);

    return AppRequestOutcome.Withdrawn;
  }

  private static identitiesOf(input: JsonObject): readonly string[] {
    const apps = RequestAppsTool.fieldOf(input, Resources.appsField);
    if (!Array.isArray(apps) || apps.length === 0 || apps.some(t => typeof t !== "string" || t === "") || new Set(apps).size !== apps.length)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.requestAppsInputMessage);

    return apps.map(t => String(t));
  }

  private static fieldOf(input: JsonObject, name: string): unknown {
    return new Map<string, unknown>(Object.entries(input)).get(name);
  }

  private static resultOf(identity: string, outcome: AppRequestOutcome, tier: AppTier | null): JsonObject {
    return {
      [Resources.identityField]: identity,
      [Resources.outcomeField]: outcome.value,
      [Resources.isGrantedField]: outcome.isGranted,
      [Resources.tierField]: tier === null ? null : tier.value
    };
  }

  private static reasonOf(input: JsonObject): string {
    const reason = RequestAppsTool.fieldOf(input, Resources.reasonField);
    if (typeof reason !== "string" || reason.trim() === "")
      throw CallFailures.of(ToolFailureCode.Refused, Resources.requestAppsInputMessage);

    return reason;
  }
}
