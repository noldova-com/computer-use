/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { Display } from "../models/display.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";

export class ListDisplaysTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.read(
    Resources.listDisplaysName,
    Resources.listDisplaysDescription,
    Resources.listDisplaysInputSchema,
    Resources.listDisplaysOutputSchema
  );
  private readonly backend: IDisplayBackend;

  public constructor(backend: IDisplayBackend) {
    this.backend = backend;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    if (Object.keys(input).length !== 0)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.listDisplaysInputMessage);
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);

    const displays = await this.listAsync(context);
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);

    return new ToolResult([], { [Resources.displaysField]: displays.map(t => t.toJson()) });
  }

  private async listAsync(context: IToolCallContext): Promise<readonly Display[]> {
    try {
      return await this.backend.listDisplaysAsync(context.signal);
    } catch (error) {
      if (context.signal.aborted)
        throw CallFailures.ofAbort(context.signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.listDisplaysFailed);
    }
  }
}
