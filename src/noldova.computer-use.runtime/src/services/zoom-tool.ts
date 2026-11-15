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
import { ToolTraits } from "../models/tool-traits.ts";
import { Resources } from "../resources.ts";
import { CallFailures } from "./call-failures.ts";
import { ImageScaler } from "./image-scaler.ts";
import type { ScreenFrames } from "./screen-frames.ts";
import { ScreenImager } from "./screen-imager.ts";

export class ZoomTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.read(
    Resources.zoomName,
    Resources.zoomDescription,
    Resources.zoomInputSchema,
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
    if (Object.keys(input).some(t => t !== Resources.regionField && t !== Resources.scaleField))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.zoomInputMessage);
    const fields = new Map<string, unknown>(Object.entries(input));
    const region = fields.get(Resources.regionField);
    if (!ZoomTool.isRegion(region))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.zoomInputMessage);
    const [left, top, right, bottom] = region;
    const scale = ScreenImager.scaleOf(fields.get(Resources.scaleField), Resources.zoomInputMessage);

    const frame = this.frames.find(context.sessionId);
    if (frame === undefined)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.zoomWithoutScreenshot);
    if (!frame.holds(left, top, right, bottom))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatRegionOutside(frame.width, frame.height));
    const capture = await this.imager.captureAsync(frame.displayId, context);
    if (!frame.isFrameOf(capture))
      throw CallFailures.of(ToolFailureCode.Stale, Resources.screenLayoutChanged);
    const image = await this.imager.encodeAsync(ImageScaler.crop(capture, frame.toDesktopRect(left, top, right, bottom)), scale);

    return new ToolResult([
      ToolContent.fromImage(Buffer.from(image.png).toString(Resources.base64Encoding), Resources.pngMediaType, Resources.screenOrigin),
      ToolContent.fromText(JSON.stringify({
        [Resources.zoomField]: { [Resources.frameField]: frame.id, [Resources.regionField]: [left, top, right, bottom], [Resources.widthField]: image.width, [Resources.heightField]: image.height }
      }), null)
    ]);
  }

  private static isRegion(value: unknown): value is readonly [number, number, number, number] {
    return Array.isArray(value) && value.length === Resources.regionLength && value.every(t => Number.isSafeInteger(t));
  }
}
