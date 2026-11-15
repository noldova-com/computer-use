/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ToolFailureCode } from "@noldova/desktop.runtime";

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { ICaptureBackend } from "../interfaces/backend/i-capture-backend.ts";
import type { IControlBackend } from "../interfaces/backend/i-control-backend.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import { AimedPoint } from "../models/aimed-point.ts";
import type { CaptureLayout } from "../models/backend/capture-layout.ts";
import type { ControlSpot } from "../models/backend/control-spot.ts";
import type { DesktopPoint } from "../models/backend/desktop-point.ts";
import type { DesktopRect } from "../models/backend/desktop-rect.ts";
import { RefusalReason } from "../models/backend/refusal-reason.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import { ImagePoint } from "../models/image-point.ts";
import type { ReadControl } from "../models/read-control.ts";
import type { ScreenFrame } from "../models/screen-frame.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { CallFailures } from "./call-failures.ts";
import type { ScreenFrames } from "./screen-frames.ts";
import type { WindowReadings } from "./window-readings.ts";

export class ScreenPoints {
  private readonly capture: ICaptureBackend;
  private readonly controls: IControlBackend;
  private readonly frames: ScreenFrames;
  private readonly input: IInputBackend;
  private readonly readings: WindowReadings;

  public constructor(frames: ScreenFrames, readings: WindowReadings, capture: ICaptureBackend, input: IInputBackend, controls: IControlBackend) {
    this.capture = capture;
    this.controls = controls;
    this.frames = frames;
    this.input = input;
    this.readings = readings;
  }

  public async pixelAsync(pixel: readonly [number, number], context: IToolCallContext): Promise<AimedPoint> {
    const frame = this.frameOf(context);
    if (!frame.holdsPoint(...pixel))
      throw CallFailures.of(ToolFailureCode.Refused, Resources.formatPointOutside(frame.width, frame.height));
    await this.checkLayoutAsync(frame, context.signal);

    return new AimedPoint(new ImagePoint(pixel[0], pixel[1]), frame.toDesktopPoint(...pixel), null);
  }

  public async pointerAsync(context: IToolCallContext): Promise<AimedPoint> {
    const frame = this.frameOf(context);
    await this.checkLayoutAsync(frame, context.signal);
    const at = await this.readPointerAsync(context.signal);
    const pixel = frame.toImagePoint(at);
    if (pixel === null)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.pointerOutside);

    return new AimedPoint(pixel, at, null);
  }

  public async controlAsync(id: string, window: WindowInfo, context: IToolCallContext): Promise<AimedPoint> {
    const frame = this.frames.find(context.sessionId);
    const reading = this.readings.find(context.sessionId);
    const control = frame !== undefined && reading !== undefined && reading.isOf(frame, window.target.windowId) ? reading.find(id) : undefined;
    if (frame === undefined || control === undefined)
      throw CallFailures.of(ToolFailureCode.Stale, Resources.controlStale);
    await this.checkLayoutAsync(frame, context.signal);

    const spot = await this.findAsync(window, control.handle, context.signal);
    if (spot === null || spot.role !== control.role || spot.name !== control.name || !spot.isEnabled || !spot.isOnScreen)
      throw CallFailures.of(ToolFailureCode.Stale, Resources.controlGone);
    const pixel = ScreenPoints.isInside(control.bounds, spot.point) ? frame.toImagePoint(spot.point) : null;
    if (pixel === null)
      throw CallFailures.of(ToolFailureCode.Stale, Resources.controlOutsideRead);

    return new AimedPoint(pixel, spot.point, control);
  }

  public async glideToControlsAsync(window: WindowInfo, to: AimedPoint, others: readonly AimedPoint[], signal: AbortSignal): Promise<void> {
    const points = [to, ...others];
    if (points.every(t => t.control === null))
      return;
    await this.input.glidePointerAsync(window.target, to.at, points.map(t => t.at), signal);

    const search = AbortSignal.any([signal, AbortSignal.timeout(Resources.controlSearchTimeoutMs)]);
    for (const point of points)
      if (point.control !== null && !await this.isStillAtAsync(window, point.control, point.at, search, signal))
        throw new RefusalException(RefusalReason.ControlChanged, false);
  }

  private frameOf(context: IToolCallContext): ScreenFrame {
    const frame = this.frames.find(context.sessionId);
    if (frame === undefined)
      throw CallFailures.of(ToolFailureCode.Refused, Resources.pointWithoutScreenshot);

    return frame;
  }

  private async checkLayoutAsync(frame: ScreenFrame, signal: AbortSignal): Promise<void> {
    if (!frame.isLayoutOf(await this.measureAsync(frame.displayId, signal)))
      throw CallFailures.of(ToolFailureCode.Stale, Resources.screenLayoutChanged);
  }

  private async findAsync(window: WindowInfo, handle: string, signal: AbortSignal): Promise<ControlSpot | null> {
    let spot: ControlSpot | null;
    try {
      spot = await this.controls.findControlAsync(window.target, handle, signal);
    } catch (error) {
      if (signal.aborted)
        throw CallFailures.ofAbort(signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.controlFindFailed);
    }
    if (signal.aborted)
      throw CallFailures.ofAbort(signal, false);

    return spot;
  }

  private async isStillAtAsync(window: WindowInfo, control: ReadControl, at: DesktopPoint, search: AbortSignal, signal: AbortSignal): Promise<boolean> {
    try {
      const spot = await this.controls.findControlAsync(window.target, control.handle, search);
      if (spot === null || spot.role !== control.role || spot.name !== control.name || !spot.isEnabled || !spot.isOnScreen || !ScreenPoints.isInside(control.bounds, spot.point))
        return false;

      return await this.controls.isControlAtAsync(window.target, control.handle, at, search);
    } catch (error) {
      signal.throwIfAborted();
      if (!search.aborted && !BackendFailures.isBackendFailure(error))
        throw error;

      return false;
    }
  }

  private async readPointerAsync(signal: AbortSignal): Promise<DesktopPoint> {
    try {
      return await this.input.readPointerAsync(signal);
    } catch (error) {
      if (signal.aborted)
        throw CallFailures.ofAbort(signal, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.pointerReadFailed);
    }
  }

  private async measureAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout> {
    try {
      return await this.capture.measureDisplayAsync(displayId, signal);
    } catch (error) {
      if (signal.aborted)
        throw CallFailures.ofAbort(signal, false);
      if (error instanceof RefusalException)
        throw CallFailures.ofRefusal(error, false);
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      throw CallFailures.causedBy(error, ToolFailureCode.Unavailable, Resources.displayMeasureFailed);
    }
  }

  private static isInside(rect: DesktopRect, point: DesktopPoint): boolean {
    return point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;
  }
}
