/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { InputKind } from "../models/input-kind.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { CallFailures } from "./call-failures.ts";
import type { ForegroundInput } from "./foreground-input.ts";
import { PointerFields } from "./pointer-fields.ts";
import type { ScreenPoints } from "./screen-points.ts";

export class ClickTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.clickName,
    Resources.clickDescription,
    Resources.clickInputSchema,
    Resources.clickOutputSchema
  );
  private static readonly FIELDS: readonly string[] = [
    Resources.xField,
    Resources.yField,
    Resources.controlField,
    Resources.buttonField,
    Resources.countField,
    Resources.modifiersField,
    Resources.summaryField
  ];
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;
  private readonly points: ScreenPoints;

  public constructor(foreground: ForegroundInput, points: ScreenPoints, input: IInputBackend) {
    this.foreground = foreground;
    this.input = input;
    this.points = points;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const fields = PointerFields.of(input, ClickTool.FIELDS, Resources.clickInputMessage);
    const aim = fields.aim();
    const button = fields.button();
    const count = fields.count();
    const modifiers = fields.modifiers();
    const summary = fields.text(Resources.summaryField);

    const window = await this.foreground.targetAsync(InputKind.Click, context, (tier, front) => {
      if (!tier.allowsClick(button, count, modifiers))
        throw CallFailures.of(ToolFailureCode.Refused, Resources.formatClickOnlyDisallows(front.appName));
    });
    const point = await aim.locateAsync(this.points, window, context);
    await this.foreground.checkPointsAsync(window, [point.at], context);
    const details = [
      ...point.details(Resources.pointDetailName, Resources.controlDetailName),
      new PermissionDetail(Resources.buttonDetailName, button.value),
      new PermissionDetail(Resources.countDetailName, String(count.count)),
      new PermissionDetail(Resources.modifiersDetailName, Resources.formatModifiers(modifiers))
    ];
    await this.foreground.askAppAsync(window, InputKind.Click, details, summary, context);
    await this.foreground.sendOnceAsync(context, async () => {
      await this.points.glideToControlsAsync(window, point, [], context.signal);
      await this.input.clickAsync(window.target, point.at, button, count, modifiers, context.signal);
    });

    return new ToolResult([], { [Resources.clickedField]: count.count });
  }
}
