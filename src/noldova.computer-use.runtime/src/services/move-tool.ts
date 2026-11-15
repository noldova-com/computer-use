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
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import type { ForegroundInput } from "./foreground-input.ts";
import { PointerFields } from "./pointer-fields.ts";
import type { ScreenPoints } from "./screen-points.ts";

export class MoveTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.moveName,
    Resources.moveDescription,
    Resources.moveInputSchema,
    Resources.moveOutputSchema
  );
  private static readonly FIELDS: readonly string[] = [Resources.xField, Resources.yField, Resources.controlField];
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;
  private readonly points: ScreenPoints;

  public constructor(foreground: ForegroundInput, points: ScreenPoints, input: IInputBackend) {
    this.foreground = foreground;
    this.input = input;
    this.points = points;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const aim = PointerFields.of(input, MoveTool.FIELDS, Resources.moveInputMessage).aim();

    const window = await this.foreground.targetAsync(InputKind.Move, context);
    const point = await aim.locateAsync(this.points, window, context);
    await this.foreground.checkPointsAsync(window, [point.at], context);
    await this.foreground.askAppAsync(window, InputKind.Move, point.details(Resources.pointDetailName, Resources.controlDetailName), null, context);
    await this.foreground.sendOnceAsync(context, async () => {
      await this.points.glideToControlsAsync(window, point, [], context.signal);
      await this.input.movePointerAsync(window.target, point.at, context.signal);
    });

    return new ToolResult([], { [Resources.movedField]: [point.pixel.x, point.pixel.y] });
  }
}
