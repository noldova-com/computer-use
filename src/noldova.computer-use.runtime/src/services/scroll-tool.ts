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
import { ScrollAmount } from "../models/backend/scroll-amount.ts";
import { InputKind } from "../models/input-kind.ts";
import { PermissionDetail } from "../models/permission-detail.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import type { ForegroundInput } from "./foreground-input.ts";
import { PointerFields } from "./pointer-fields.ts";
import type { ScreenPoints } from "./screen-points.ts";

export class ScrollTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.input(
    Resources.scrollName,
    Resources.scrollDescription,
    Resources.scrollInputSchema,
    Resources.scrollOutputSchema
  );
  private static readonly DIRECTIONS: ReadonlyMap<string, readonly [number, number]> = new Map<string, readonly [number, number]>([
    [Resources.upDirectionName, [0, -1]],
    [Resources.downDirectionName, [0, 1]],
    [Resources.leftDirectionName, [-1, 0]],
    [Resources.rightDirectionName, [1, 0]]
  ]);
  private static readonly FIELDS: readonly string[] = [Resources.xField, Resources.yField, Resources.controlField, Resources.directionField, Resources.amountField, Resources.summaryField];
  private readonly foreground: ForegroundInput;
  private readonly input: IInputBackend;
  private readonly points: ScreenPoints;

  public constructor(foreground: ForegroundInput, points: ScreenPoints, input: IInputBackend) {
    this.foreground = foreground;
    this.input = input;
    this.points = points;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    const fields = PointerFields.of(input, ScrollTool.FIELDS, Resources.scrollInputMessage);
    const aim = fields.aim();
    const [right, down] = fields.choice(Resources.directionField, ScrollTool.DIRECTIONS);
    const direction = fields.text(Resources.directionField);
    const notches = fields.integer(Resources.amountField, 1, ScrollAmount.maxNotches);
    const summary = fields.text(Resources.summaryField);
    const amount = new ScrollAmount(right * notches, down * notches);

    const window = await this.foreground.targetAsync(InputKind.Scroll, context);
    const point = await aim.locateAsync(this.points, window, context);
    await this.foreground.checkPointsAsync(window, [point.at], context);
    const details = [
      ...point.details(Resources.pointDetailName, Resources.controlDetailName),
      new PermissionDetail(Resources.directionDetailName, direction),
      new PermissionDetail(Resources.amountDetailName, String(notches))
    ];
    await this.foreground.askAppAsync(window, InputKind.Scroll, details, summary, context);
    await this.foreground.sendOnceAsync(context, async () => {
      await this.points.glideToControlsAsync(window, point, [], context.signal);
      await this.input.scrollAsync(window.target, point.at, amount, [], context.signal);
    });

    return new ToolResult([], { [Resources.scrolledField]: notches });
  }
}
