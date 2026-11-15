/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IToolHandler, ToolCall, ToolResult } from "@noldova/desktop.runtime";

import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import { CallContext } from "../models/call-context.ts";
import type { ActionQueue } from "./action-queue.ts";
import type { ControlSwitch } from "./control-switch.ts";
import type { ScreenSessionGate } from "./screen-session-gate.ts";

export class ControlledTool implements IToolHandler {
  private readonly control: ControlSwitch;
  private readonly gate: ScreenSessionGate;
  private readonly lifetime: AbortSignal;
  private readonly name: string;
  private readonly queue: ActionQueue;
  private readonly tool: IComputerTool;

  public constructor(name: string, tool: IComputerTool, gate: ScreenSessionGate, queue: ActionQueue, control: ControlSwitch, lifetime: AbortSignal) {
    this.control = control;
    this.gate = gate;
    this.lifetime = lifetime;
    this.name = name;
    this.queue = queue;
    this.tool = tool;
  }

  public async handleAsync(call: ToolCall): Promise<ToolResult> {
    const context = new CallContext(call, AbortSignal.any([call.signal, this.lifetime]));
    this.gate.ensureFree(context);

    return await this.queue.runAsync(context.signal, async () => {
      await this.gate.ensureGrantedAsync(this.name, call.arguments, context);
      this.control.enter(context);

      return await this.tool.handleAsync(call.arguments, context);
    });
  }
}
