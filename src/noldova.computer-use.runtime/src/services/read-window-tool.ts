/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, ToolContent, ToolFailureCode, ToolResult } from "@noldova/desktop.runtime";

import type { IControlBackend } from "../interfaces/backend/i-control-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { ControlTree } from "../models/backend/control-tree.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import type { ReadControl } from "../models/read-control.ts";
import { ScreenFrame } from "../models/screen-frame.ts";
import { ToolTraits } from "../models/tool-traits.ts";
import { WindowReading } from "../models/window-reading.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import { ControlListing } from "./control-listing.ts";
import type { ForegroundInput } from "./foreground-input.ts";
import { ImageScaler } from "./image-scaler.ts";
import type { ScreenFrames } from "./screen-frames.ts";
import type { ScreenImager } from "./screen-imager.ts";
import type { WindowReadings } from "./window-readings.ts";

export class ReadWindowTool implements IComputerTool {
  public static readonly descriptor: IToolDescriptor = ToolTraits.read(
    Resources.readWindowName,
    Resources.readWindowDescription,
    Resources.readWindowInputSchema,
    null,
    ToolTraits.imageLimits
  );
  private readonly backend: IControlBackend;
  private readonly foreground: ForegroundInput;
  private readonly frames: ScreenFrames;
  private readonly imager: ScreenImager;
  private readonly readings: WindowReadings;

  public constructor(foreground: ForegroundInput, imager: ScreenImager, frames: ScreenFrames, readings: WindowReadings, backend: IControlBackend) {
    this.backend = backend;
    this.foreground = foreground;
    this.frames = frames;
    this.imager = imager;
    this.readings = readings;
  }

  public async handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult> {
    if (Object.keys(input).some(t => t !== Resources.controlField))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.readWindowInputMessage);
    const named = new Map<string, unknown>(Object.entries(input)).get(Resources.controlField);
    if (named !== undefined && (typeof named !== "string" || named === ""))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.readWindowInputMessage);
    const id = typeof named === "string" ? named : null;

    const window = await this.foreground.readableAsync(context);
    const frame = await this.frameOfAsync(window, context);
    const reading = this.readings.find(context.sessionId);
    const under = id === null ? null : ReadWindowTool.controlOf(reading, frame, window, id);
    const tree = await this.readAsync(window, under, context);
    const listed = ControlListing.write(tree, frame, reading?.nextNumber ?? Resources.firstControlNumber, await this.hiddenAppsAsync(window, tree, context));
    if (this.frames.find(context.sessionId) !== frame)
      this.frames.set(context.sessionId, frame);
    this.readings.set(context.sessionId, under === null || reading === undefined ? WindowReading.of(frame, window.target.windowId, listed) : reading.withUnder(listed));

    return new ToolResult([
      ToolContent.fromText(JSON.stringify({
        [Resources.frameField]: frame.toJson(),
        [Resources.windowField]: { [Resources.appField]: window.appName, [Resources.identityField]: window.app.id },
        ...(under === null ? {} : { [Resources.underField]: under.id }),
        [Resources.listedField]: listed.listed,
        [Resources.leftOutField]: listed.leftOut,
        [Resources.timedOutField]: tree.isTimedOut
      }), null),
      ToolContent.fromText(listed.text, Resources.windowOrigin)
    ]);
  }

  private async frameOfAsync(window: WindowInfo, context: IToolCallContext): Promise<ScreenFrame> {
    const display = await this.imager.findDisplayOfAsync(window.frame, context.signal);
    if (display === undefined)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.refusalOutsideDisplays);
    const layout = await this.imager.measureAsync(display.id, context.signal);
    const frame = this.frames.find(context.sessionId);
    if (frame !== undefined && frame.isLayoutOf(layout))
      return frame;
    const size = ImageScaler.fit(layout.width, layout.height, Resources.defaultImageScale);

    return new ScreenFrame(this.frames.nextId(), layout.displayId, layout.frame, size.width, size.height);
  }

  private async hiddenAppsAsync(window: WindowInfo, tree: ControlTree, context: IToolCallContext): Promise<ReadonlySet<string>> {
    const others = new Map(tree.controls.filter(t => t.app.id !== window.app.id).map(t => [t.app.id, t.app]));
    const hidden = new Set<string>();
    for (const app of others.values())
      if (!await this.foreground.isReadableAsync(app, context))
        hidden.add(app.id);

    return hidden;
  }

  private static controlOf(reading: WindowReading | undefined, frame: ScreenFrame, window: WindowInfo, id: string): ReadControl {
    const control = reading !== undefined && reading.isOf(frame, window.target.windowId) ? reading.find(id) : undefined;
    if (control === undefined)
      throw CallFailures.of(ToolFailureCode.Stale, Resources.unknownControl);

    return control;
  }

  private async readAsync(window: WindowInfo, under: ReadControl | null, context: IToolCallContext): Promise<ControlTree> {
    let tree: ControlTree;
    try {
      tree = await this.backend.readControlsAsync(window.target, under === null ? null : under.handle, context.signal);
    } catch (error) {
      if (context.signal.aborted)
        throw CallFailures.ofAbort(context.signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.readWindowFailed);
    }
    if (context.signal.aborted)
      throw CallFailures.ofAbort(context.signal, false);

    return tree;
  }
}
