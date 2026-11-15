/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { RefusalReason } from "../models/backend/refusal-reason.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import { InputKind } from "../models/input-kind.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import { ForegroundInput } from "./foreground-input.ts";

export class TypeTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.typeName,
    Resources.typeDescription,
    Resources.typeInputSchema,
    Resources.typeOutputSchema,
    Resources.typeDeadlineMs
  );
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;

  public constructor(foreground: ForegroundInput, input: IInputBackend) {
    this.foreground = foreground;
    this.input = input;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const text = TypeTool.stringOf(input, Resources.textField);
    const summary = TypeTool.stringOf(input, Resources.summaryField);
    if (text.length > Resources.typeMaxTextLength)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.typeInputMessage);

    const window = await this.foreground.targetAsync(InputKind.Type, context);
    await this.foreground.askAppAsync(window, InputKind.Type, [new PermissionDetail(Resources.textDetailName, text)], summary, context);
    await this.foreground.watchAsync(context, async () => await this.sendAsync(window, text, context));

    return new ToolResult([], { [Resources.typedField]: text.length });
  }

  private async sendAsync(window: WindowInfo, text: string, context: IToolCallContext): Promise<void> {
    const signal = context.signal;
    ForegroundInput.markSending(context);
    let isInputSent = false;
    const chunks = TypeTool.chunksOf(text, this.input.maxTextChunkLength);
    for (const [index, chunk] of chunks.entries()) {
      try {
        await this.input.typeTextAsync(window.target, chunk, signal);
      } catch (error) {
        if (error instanceof RefusalException)
          throw CallFailures.ofRefusal(error, isInputSent);
        if (!signal.aborted && !BackendFailures.isBackendFailure(error))
          throw error;

        throw CallFailures.ofBackendFailure(signal, isInputSent, error);
      }
      isInputSent = true;
      if (index + 1 < chunks.length && Resources.focusMovers.includes(chunk.slice(-1)))
        throw CallFailures.ofRefusal(new RefusalException(RefusalReason.PasswordField, true), true);
    }
    if (signal.aborted)
      throw CallFailures.ofAbort(signal, true);
  }

  private static chunksOf(text: string, maxLength: number): readonly string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + maxLength, text.length);
      if (end < text.length && end - start > 1 && (TypeTool.isHighSurrogate(text.charCodeAt(end - 1)) || text.startsWith(Resources.windowsLineBreak, end - 1)))
        end -= 1;
      chunks.push(text.slice(start, end));
      start = end;
    }

    return chunks;
  }

  private static isHighSurrogate(code: number): boolean {
    return code >= Resources.highSurrogateFirst && code <= Resources.highSurrogateLast;
  }

  private static stringOf(input: JsonObject, name: string): string {
    const value = new Map<string, unknown>(Object.entries(input)).get(name);
    if (typeof value !== "string" || value === "")
      throw CallFailures.of(ToolFailureCode.Refused, Resources.typeInputMessage);

    return value;
  }
}
