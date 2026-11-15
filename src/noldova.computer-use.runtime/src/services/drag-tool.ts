/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolResult } from "@noldova/desktop.runtime";

import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { InputKind } from "../models/input-kind.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import type { ForegroundInput } from "./foreground-input.ts";
import { PointerFields } from "./pointer-fields.ts";
import type { ScreenPoints } from "./screen-points.ts";

export class DragTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.dragName,
    Resources.dragDescription,
    Resources.dragInputSchema,
    Resources.dragOutputSchema
  );
  private static readonly FIELDS: readonly string[] = [Resources.fromField, Resources.toField, Resources.buttonField, Resources.modifiersField, Resources.summaryField];
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;
  private readonly points: ScreenPoints;

  public constructor(foreground: ForegroundInput, points: ScreenPoints, input: IInputBackend) {
    this.foreground = foreground;
    this.input = input;
    this.points = points;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const fields = PointerFields.of(input, DragTool.FIELDS, Resources.dragInputMessage);
    const start = fields.optionalEnd(Resources.fromField);
    const end = fields.end(Resources.toField);
    const button = fields.button();
    const modifiers = fields.modifiers();
    const summary = fields.text(Resources.summaryField);

    const window = await this.foreground.targetAsync(InputKind.Drag, context);
    const from = await start.locateAsync(this.points, window, context);
    const to = await end.locateAsync(this.points, window, context);
    await this.foreground.checkPointsAsync(window, [from.at, to.at], context);
    const details = [
      ...from.details(Resources.fromDetailName, Resources.fromControlDetailName),
      ...to.details(Resources.toDetailName, Resources.toControlDetailName),
      new PermissionDetail(Resources.buttonDetailName, button.value),
      new PermissionDetail(Resources.modifiersDetailName, Resources.formatModifiers(modifiers))
    ];
    await this.foreground.askAppAsync(window, InputKind.Drag, details, summary, context);
    await this.foreground.sendOnceAsync(context, async () => {
      await this.points.glideToControlsAsync(window, from, [to], context.signal);
      await this.input.dragAsync(window.target, from.at, to.at, button, modifiers, context.signal);
    });

    return new ToolResult([], { [Resources.draggedField]: [[from.pixel.x, from.pixel.y], [to.pixel.x, to.pixel.y]] });
  }
}
