/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IAppShortcuts, type IToolDescriptor, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import { InputKind } from "../models/input-kind.ts";
import { KeyChord } from "../models/key-chord.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import { ForegroundInput } from "./foreground-input.ts";

export class KeyTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.keyName,
    Resources.keyDescription,
    Resources.keyInputSchema,
    Resources.keyOutputSchema
  );
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;
  private readonly shortcuts: IAppShortcuts;

  public constructor(foreground: ForegroundInput, input: IInputBackend, shortcuts: IAppShortcuts) {
    this.foreground = foreground;
    this.input = input;
    this.shortcuts = shortcuts;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const fields = KeyTool.fieldsOf(input);
    const chord = KeyChord.parse(KeyTool.stringOf(fields, Resources.keysField));
    const repeat = KeyTool.repeatOf(fields);
    const summary = KeyTool.stringOf(fields, Resources.summaryField);
    if (chord === null)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.keyInputMessage);
    if (KeyTool.isAppShortcut(this.shortcuts, chord))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatAppShortcut(chord.text));

    const window = await this.foreground.targetAsync(InputKind.Key, context);
    const details = [
      new PermissionDetail(Resources.keysDetailName, chord.text),
      new PermissionDetail(Resources.repeatDetailName, String(repeat))
    ];
    await this.foreground.askAppAsync(window, InputKind.Key, details, summary, context);
    if (this.input.isSystemCombination(chord.key, chord.modifiers))
      await this.foreground.askPersonAsync(Resources.systemKeysAction, Resources.systemKeysTitle, window, details, summary, context);
    await this.foreground.watchAsync(context, async () => await this.sendAsync(window, chord, repeat, context));

    return new ToolResult([], { [Resources.pressedField]: repeat });
  }

  public static isAppShortcut(shortcuts: IAppShortcuts, chord: KeyChord): boolean {
    return shortcuts.list().some(t => KeyChord.readShortcut(t.key.text).some(u => u.isSameAs(chord)));
  }

  private async sendAsync(window: WindowInfo, chord: KeyChord, repeat: number, context: IToolCallContext): Promise<void> {
    const signal = context.signal;
    ForegroundInput.markSending(context);
    let isInputSent = false;
    for (let pressed = 0; pressed < repeat; pressed += 1) {
      try {
        await this.input.pressKeyAsync(window.target, chord.key, chord.modifiers, signal);
      } catch (error) {
        if (error instanceof RefusalException)
          throw CallFailures.ofRefusal(error, isInputSent);
        if (!signal.aborted && !BackendFailures.isBackendFailure(error))
          throw error;

        throw CallFailures.ofBackendFailure(signal, isInputSent, error);
      }
      isInputSent = true;
    }
    if (signal.aborted)
      throw CallFailures.ofAbort(signal, true);
  }

  private static fieldsOf(input: JsonObject): ReadonlyMap<string, unknown> {
    return new Map<string, unknown>(Object.entries(input));
  }

  private static repeatOf(fields: ReadonlyMap<string, unknown>): number {
    const value = fields.get(Resources.repeatField);
    if (value === undefined)
      return 1;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > Resources.keyMaxRepeat)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.keyInputMessage);

    return value;
  }

  private static stringOf(fields: ReadonlyMap<string, unknown>, name: string): string {
    const value = fields.get(name);
    if (typeof value !== "string" || value === "")
      throw CallFailures.of(ToolFailureCode.Refused, Resources.keyInputMessage);

    return value;
  }
}
