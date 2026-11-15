/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject, JsonValue } from "@noldova/computer-use.protocol";
import { type IAppShortcuts, type IToolDescriptor, ToolFailureCode, ToolFailureException, ToolResult } from "@noldova/desktop.runtime";

import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { InputKind } from "../models/input-kind.ts";
import { KeyChord } from "../models/key-chord.ts";
import { ListedAction } from "../models/listed-action.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import type { InputSchema } from "../types/input-schema.ts";
import { CallFailures } from "./call-failures.ts";
import type { ForegroundInput } from "./foreground-input.ts";
import { KeyTool } from "./key-tool.ts";

export class BatchTool implements IComputerTool {
  private static readonly ACTIONS: readonly (readonly [InputKind, InputSchema])[] = [
    [InputKind.Click, Resources.clickInputSchema],
    [InputKind.Scroll, Resources.scrollInputSchema],
    [InputKind.Move, Resources.moveInputSchema],
    [InputKind.Drag, Resources.dragInputSchema],
    [InputKind.Type, Resources.typeInputSchema],
    [InputKind.Key, Resources.keyInputSchema]
  ];
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.batchName,
    Resources.batchDescription,
    BatchTool.inputSchema(),
    Resources.batchOutputSchema,
    Resources.batchDeadlineMs
  );
  private static readonly FIELDS: readonly string[] = [Resources.actionsField, Resources.summaryField];
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;
  private readonly shortcuts: IAppShortcuts;
  private readonly tools: ReadonlyMap<InputKind, IComputerTool>;

  public constructor(foreground: ForegroundInput, input: IInputBackend, shortcuts: IAppShortcuts, tools: ReadonlyMap<InputKind, IComputerTool>) {
    this.foreground = foreground;
    this.input = input;
    this.shortcuts = shortcuts;
    this.tools = tools;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const actions = this.actionsOf(input);

    return await this.foreground.watchAsync(context, async () => {
      const results: (JsonObject | null)[] = [];
      for (const [index, action] of actions.entries()) {
        try {
          results.push((await action.tool.handleAsync(action.input, context)).structured);
        } catch (error) {
          if (!(error instanceof ToolFailureException))
            throw error;

          const message = Resources.formatBatchEnded(index, actions.length, action.kind.inputName, error.failure.message);
          throw error.cause === undefined
            ? CallFailures.of(error.failure.code, message, error.failure.moduleCode)
            : CallFailures.causedBy(error.cause, error.failure.code, message, error.failure.moduleCode);
        }
      }

      return new ToolResult([], { [Resources.ranField]: actions.length, [Resources.resultsField]: results });
    });
  }

  private actionsOf(input: JsonObject): readonly ListedAction[] {
    if (Object.keys(input).some(t => !BatchTool.FIELDS.includes(t)))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.batchInputMessage);

    const items = input[Resources.actionsField];
    const summary = input[Resources.summaryField];
    if (!Array.isArray(items) || items.length === 0 || items.length > Resources.batchMaxActions || typeof summary !== "string" || summary === "")
      throw CallFailures.of(ToolFailureCode.Refused, Resources.batchInputMessage);

    const actions = items.map(t => this.actionOf(t, summary));
    for (const action of actions) {
      const keys = action.kind === InputKind.Key ? action.input[Resources.keysField] : undefined;
      const chord = typeof keys === "string" ? KeyChord.parse(keys) : null;
      if (chord !== null && KeyTool.isAppShortcut(this.shortcuts, chord))
        throw CallFailures.of(ToolFailureCode.Refused, Resources.formatAppShortcut(chord.text));
      if (chord !== null && this.input.isSystemCombination(chord.key, chord.modifiers))
        throw CallFailures.of(ToolFailureCode.Refused, Resources.formatBatchSystemKeys(chord.text));
    }

    return actions;
  }

  private actionOf(item: JsonValue, summary: string): ListedAction {
    if (!BatchTool.isObject(item) || Resources.summaryField in item)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.batchInputMessage);

    const name = item[Resources.actionField];
    const entry = BatchTool.ACTIONS.find(t => t[0].inputName === name);
    const tool = entry === undefined ? undefined : this.tools.get(entry[0]);
    if (entry === undefined || tool === undefined)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.batchInputMessage);

    const fields = Object.fromEntries(Object.entries(item).filter(t => t[0] !== Resources.actionField));

    return new ListedAction(entry[0], tool, BatchTool.takesSummary(entry[1]) ? { ...fields, [Resources.summaryField]: summary } : fields);
  }

  private static inputSchema(): JsonObject {
    const actions = BatchTool.ACTIONS.map(([kind, schema]) => {
      const properties = Object.entries(schema.properties).filter(t => t[0] !== Resources.summaryField);
      const required = schema.required.filter(t => t !== Resources.summaryField);

      return {
        ...schema,
        properties: { [Resources.actionField]: { const: kind.inputName }, ...Object.fromEntries(properties) },
        required: [Resources.actionField, ...required]
      };
    });

    return {
      type: Resources.schemaObjectType,
      properties: {
        [Resources.actionsField]: { type: Resources.schemaArrayType, minItems: Resources.batchMinActions, maxItems: Resources.batchMaxActions, items: { anyOf: actions } },
        [Resources.summaryField]: { type: Resources.schemaStringType, minLength: Resources.minSummaryLength }
      },
      required: [Resources.actionsField, Resources.summaryField],
      additionalProperties: false
    };
  }

  private static takesSummary(schema: InputSchema): boolean {
    return Resources.summaryField in schema.properties;
  }

  private static isObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
