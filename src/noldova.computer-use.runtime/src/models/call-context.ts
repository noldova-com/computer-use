/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPermissionRequest, PermissionOutcome, ToolCall } from "@noldova/desktop.runtime";

import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";

export class CallContext implements IToolCallContext {
  private readonly call: ToolCall;

  public readonly signal: AbortSignal;

  public constructor(call: ToolCall, signal: AbortSignal) {
    this.call = call;
    this.signal = signal;
  }

  public get scope(): string {
    return this.call.scope;
  }

  public get sessionId(): string {
    return this.call.session;
  }

  public async requestPermissionAsync(request: IPermissionRequest): Promise<PermissionOutcome> {
    return await this.call.requestPermissionAsync(request);
  }

  public markSending(): void {
    this.call.markSending();
  }
}
