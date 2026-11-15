/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { GrantRecord } from "../models/grant-record.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { AppListing } from "./app-listing.ts";
import { CallFailures } from "./call-failures.ts";
import type { TierPolicy } from "./tier-policy.ts";

export class ListAppsTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.read(
    Resources.listAppsName,
    Resources.listAppsDescription,
    Resources.listAppsInputSchema,
    Resources.listAppsOutputSchema
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
    if (Object.keys(input).length !== 0)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.listAppsInputMessage);

    const apps = await AppListing.listAsync(this.backend, context.signal, Resources.listAppsFailed);
    const listed = apps.map(t => ({
      [Resources.identityField]: t.identity.id,
      [Resources.nameField]: t.name,
      [Resources.publisherField]: t.publisher,
      [Resources.isRunningField]: t.isRunning,
      [Resources.tierField]: this.policy.tierOf(t)?.value ?? null,
      [Resources.isGrantedField]: this.record.find(context.scope, t.identity) !== undefined
    }));

    return new ToolResult([], { [Resources.appsField]: listed });
  }
}
