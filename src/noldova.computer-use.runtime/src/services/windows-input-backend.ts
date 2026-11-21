/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import type { IWindowsGlideStepJson } from "../interfaces/i-windows-glide-step-json.ts";
import type { IWindowsOutcomeJson } from "../interfaces/i-windows-outcome-json.ts";
import type { IWindowsTargetJson } from "../interfaces/i-windows-target-json.ts";
import type { ClickCount } from "../models/backend/click-count.ts";
import { DesktopPoint } from "../models/backend/desktop-point.ts";
import { GlidePath } from "../models/backend/glide-path.ts";
import type { InputTarget } from "../models/backend/input-target.ts";
import { KeyName } from "../models/backend/key-name.ts";
import { ModifierKey } from "../models/backend/modifier-key.ts";
import type { PointerButton } from "../models/backend/pointer-button.ts";
import { RefusalReason } from "../models/backend/refusal-reason.ts";
import type { ScrollAmount } from "../models/backend/scroll-amount.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";
import { BackendFailures } from "./backend-failures.ts";

export class WindowsInputBackend implements IInputBackend {
  private static readonly SYSTEM_COMBINATIONS: readonly (readonly [KeyName, readonly ModifierKey[]])[] = [
    [KeyName.Tab, [ModifierKey.Alt]],
    [KeyName.Tab, [ModifierKey.Alt, ModifierKey.Shift]],
    [KeyName.Tab, [ModifierKey.Control, ModifierKey.Alt]],
    [KeyName.Tab, [ModifierKey.Control, ModifierKey.Alt, ModifierKey.Shift]],
    [KeyName.Escape, [ModifierKey.Alt]],
    [KeyName.Escape, [ModifierKey.Alt, ModifierKey.Shift]],
    [KeyName.F4, [ModifierKey.Alt]],
    [KeyName.Space, [ModifierKey.Alt]],
    [KeyName.Escape, [ModifierKey.Control]],
    [KeyName.Escape, [ModifierKey.Control, ModifierKey.Shift]],
    [KeyName.Delete, [ModifierKey.Control, ModifierKey.Alt]]
  ];

  private readonly api: IWindowsDesktopApi;
  private readonly focusMs: number;

  public readonly maxTextChunkLength: number = Resources.windowsMaxTextChunkLength;

  public constructor(api: IWindowsDesktopApi, focusMs: number) {
    this.api = api;
    this.focusMs = focusMs;
  }

  public async readPointerAsync(signal: AbortSignal): Promise<DesktopPoint> {
    signal.throwIfAborted();
    const pointer = this.api.readPointer();
    return BackendAnswers.read(Resources.windowsReadPointerAnswer, pointer, () => new DesktopPoint(pointer.x, pointer.y));
  }

  public async movePointerAsync(target: InputTarget, to: DesktopPoint, signal: AbortSignal): Promise<void> {
    const physicalBefore = this.readPhysicalCountAt(signal);
    await this.glideAsync(target, to, [to], physicalBefore, signal);
    signal.throwIfAborted();
    WindowsInputBackend.settle(this.api.movePointer(WindowsInputBackend.toTarget(target), to.x, to.y, physicalBefore));
  }

  public async clickAsync(target: InputTarget, at: DesktopPoint, button: PointerButton, count: ClickCount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    const physicalBefore = this.readPhysicalCountAt(signal);
    await this.glideAsync(target, at, [at], physicalBefore, signal);
    signal.throwIfAborted();
    const outcome = this.api.click(WindowsInputBackend.toTarget(target), at.x, at.y, button.value, count.count, modifiers.map(t => t.value), physicalBefore);
    WindowsInputBackend.settle(outcome);
  }

  public async dragAsync(target: InputTarget, from: DesktopPoint, to: DesktopPoint, button: PointerButton, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    const physicalBefore = this.readPhysicalCountAt(signal);
    await this.glideAsync(target, from, [from, to], physicalBefore, signal);
    signal.throwIfAborted();
    const steps = WindowsInputBackend.toSteps(GlidePath.between(from, to));
    const stop = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    const end = (): void => {
      Atomics.store(stop, 0, Resources.stopFlagSet);
    };
    signal.addEventListener("abort", end, { once: true });
    let outcome: IWindowsOutcomeJson;
    try {
      outcome = await this.api.drag(WindowsInputBackend.toTarget(target), from.x, from.y, to.x, to.y, steps, button.value, modifiers.map(t => t.value), stop, physicalBefore);
    } finally {
      signal.removeEventListener("abort", end);
    }
    if (outcome.status === Resources.stoppedStatus && outcome.inputSent !== true)
      signal.throwIfAborted();
    WindowsInputBackend.settle(outcome);
  }

  public async scrollAsync(target: InputTarget, at: DesktopPoint, amount: ScrollAmount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    const physicalBefore = this.readPhysicalCountAt(signal);
    await this.glideAsync(target, at, [at], physicalBefore, signal);
    signal.throwIfAborted();
    WindowsInputBackend.settle(this.api.scroll(WindowsInputBackend.toTarget(target), at.x, at.y, amount.x, amount.y, modifiers.map(t => t.value), physicalBefore));
  }

  public async typeTextAsync(target: InputTarget, chunk: string, signal: AbortSignal): Promise<void> {
    if (chunk.length === 0 || chunk.length > this.maxTextChunkLength)
      throw new ArgumentOutOfRangeException(Resources.chunkParameterName, chunk.length, Resources.formatInvalidTextChunk(chunk.length, this.maxTextChunkLength));

    signal.throwIfAborted();
    WindowsInputBackend.settle(this.api.typeText(WindowsInputBackend.toTarget(target), chunk, this.focusMs));
  }

  public async pressKeyAsync(target: InputTarget, key: KeyName, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    WindowsInputBackend.settle(this.api.pressKey(WindowsInputBackend.toTarget(target), key.value, modifiers.map(t => t.value), this.focusMs));
  }

  public isSystemCombination(key: KeyName, modifiers: readonly ModifierKey[]): boolean {
    return modifiers.includes(ModifierKey.Meta) ||
      WindowsInputBackend.SYSTEM_COMBINATIONS.some(([systemKey, held]) => systemKey === key && held.length === modifiers.length && held.every(t => modifiers.includes(t)));
  }

  public async glidePointerAsync(target: InputTarget, to: DesktopPoint, points: readonly DesktopPoint[], signal: AbortSignal): Promise<void> {
    await this.glideAsync(target, to, points, this.readPhysicalCountAt(signal), signal);
  }

  private readPhysicalCountAt(signal: AbortSignal): number {
    signal.throwIfAborted();

    return this.api.readPhysicalCount();
  }

  private async glideAsync(target: InputTarget, to: DesktopPoint, points: readonly DesktopPoint[], physicalBefore: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    let from: DesktopPoint;
    try {
      from = await this.readPointerAsync(signal);
    } catch (error) {
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      return;
    }
    const path = GlidePath.between(from, to);
    if (path.steps.length === 0)
      return;

    const outcome = await this.api.glidePointer(WindowsInputBackend.toTarget(target), WindowsInputBackend.toSteps(path), points.map(t => ({ x: t.x, y: t.y })), physicalBefore);
    WindowsInputBackend.settle(outcome);
  }

  private static settle(outcome: IWindowsOutcomeJson): void {
    if (outcome.status === Resources.refusedStatus)
      throw new RefusalException(RefusalReason.parse(outcome.reason ?? ""), outcome.inputSent === true);
  }

  private static toSteps(path: GlidePath): readonly IWindowsGlideStepJson[] {
    return path.steps.map(t => ({ x: t.point.x, y: t.point.y, atMs: t.atMs }));
  }

  private static toTarget(target: InputTarget): IWindowsTargetJson {
    return { windowId: target.windowId, processId: target.processId, imagePath: target.app.id };
  }
}
