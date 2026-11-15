/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolContent, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { ScreenFrame } from "../models/screen-frame.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { CallFailures } from "./call-failures.ts";
import type { ScreenFrames } from "./screen-frames.ts";
import { ScreenImager } from "./screen-imager.ts";

export class ScreenshotTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.read(
    Resources.screenshotName,
    Resources.screenshotDescription,
    Resources.screenshotInputSchema,
    null,
    ToolTraits.imageLimits
  );
  private readonly frames: ScreenFrames;
  private readonly imager: ScreenImager;

  public constructor(imager: ScreenImager, frames: ScreenFrames) {
    this.frames = frames;
    this.imager = imager;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    if (Object.keys(input).some(t => t !== Resources.displayField && t !== Resources.scaleField))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.screenshotInputMessage);
    const fields = new Map<string, unknown>(Object.entries(input));
    const named = fields.get(Resources.displayField);
    if (named !== undefined && (typeof named !== "string" || named === ""))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.screenshotInputMessage);
    const displayId = typeof named === "string" ? named : null;
    const scale = ScreenImager.scaleOf(fields.get(Resources.scaleField), Resources.screenshotInputMessage);

    const display = await this.imager.findDisplayAsync(displayId, context.signal);
    if (display === undefined)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatNoDisplay(displayId));
    const capture = await this.imager.captureAsync(display.id, context);
    const image = await this.imager.encodeAsync(capture, scale);
    const frame = new ScreenFrame(this.frames.nextId(), display.id, capture.frame, image.width, image.height);
    this.frames.set(context.sessionId, frame);

    return new ToolResult([
      ToolContent.fromImage(Buffer.from(image.png).toString(Resources.base64Encoding), Resources.pngMediaType, Resources.screenOrigin),
      ToolContent.fromText(JSON.stringify({ [Resources.frameField]: frame.toJson() }), null)
    ]);
  }
}
