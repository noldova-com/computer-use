/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { DesktopPoint, ModifierKey, RefusalException, RefusalReason } from "@noldova/computer-use.runtime";
import type { ClickCount, IInputBackend, InputTarget, KeyName, PointerButton, ScrollAmount } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import type { ISentInput } from "./interfaces/i-sent-input.ts";
import type { WindowBackendDouble } from "./window-backend-double.fixture.ts";

export class InputBackendDouble implements IInputBackend {
  private readonly windows: WindowBackendDouble;

  public afterGlide: (() => void) | null = null;
  public readonly glides: { readonly target: InputTarget; readonly to: DesktopPoint; readonly points: readonly DesktopPoint[] }[] = [];
  public isPasswordFieldFocused: boolean = false;
  public readonly maxTextChunkLength: number;
  public pointer: DesktopPoint = new DesktopPoint(0, 0);
  public refusalAfterSending: RefusalReason | null = null;
  public refusalBeforeSending: RefusalReason | null = null;
  public readonly sent: ISentInput[] = [];

  public constructor(windows: WindowBackendDouble, maxTextChunkLength: number) {
    this.windows = windows;
    this.maxTextChunkLength = maxTextChunkLength;
  }

  public async readPointerAsync(signal: AbortSignal): Promise<DesktopPoint> {
    signal.throwIfAborted();

    return this.pointer;
  }

  public async glidePointerAsync(target: InputTarget, to: DesktopPoint, points: readonly DesktopPoint[], signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.glides.push({ target, to, points });
    this.afterGlide?.();
  }

  public async movePointerAsync(target: InputTarget, to: DesktopPoint, signal: AbortSignal): Promise<void> {
    this.send({ ...InputBackendDouble.emptyInput(target, "move"), points: [to] }, signal);
  }

  public async clickAsync(target: InputTarget, at: DesktopPoint, button: PointerButton, count: ClickCount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    this.send({ ...InputBackendDouble.emptyInput(target, "click"), points: [at], button, count, modifiers }, signal);
  }

  public async dragAsync(target: InputTarget, from: DesktopPoint, to: DesktopPoint, button: PointerButton, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    this.send({ ...InputBackendDouble.emptyInput(target, "drag"), points: [from, to], button, modifiers }, signal);
  }

  public async scrollAsync(target: InputTarget, at: DesktopPoint, amount: ScrollAmount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    this.send({ ...InputBackendDouble.emptyInput(target, "scroll"), points: [at], amount, modifiers }, signal);
  }

  public async typeTextAsync(target: InputTarget, chunk: string, signal: AbortSignal): Promise<void> {
    if (chunk.length === 0 || chunk.length > this.maxTextChunkLength)
      throw new ArgumentOutOfRangeException("chunk", chunk.length);

    this.send({ ...InputBackendDouble.emptyInput(target, "type"), text: chunk }, signal);
  }

  public async pressKeyAsync(target: InputTarget, key: KeyName, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    this.send({ ...InputBackendDouble.emptyInput(target, "press"), key, modifiers }, signal);
  }

  public isSystemCombination(_key: KeyName, modifiers: readonly ModifierKey[]): boolean {
    return modifiers.includes(ModifierKey.Meta);
  }

  private send(input: ISentInput, signal: AbortSignal): void {
    signal.throwIfAborted();
    const refusal = this.check(input);
    if (refusal !== null)
      throw new RefusalException(refusal, false);

    this.sent.push(input);
    if (this.refusalAfterSending !== null)
      throw new RefusalException(this.refusalAfterSending, true);
  }

  private check(input: ISentInput): RefusalReason | null {
    const window = this.windows.foreground;
    if (window === null || !InputBackendDouble.isSameTarget(window.target, input.target))
      return RefusalReason.NotForeground;

    if (window.isElevated)
      return RefusalReason.ElevatedTarget;

    const { frame } = window;
    if (input.points.some(t => t.x < frame.x || t.y < frame.y || t.x >= frame.x + frame.width || t.y >= frame.y + frame.height))
      return RefusalReason.OtherWindowAtPoint;

    if (this.isPasswordFieldFocused && (input.action === "type" || input.action === "press"))
      return RefusalReason.PasswordField;

    return this.refusalBeforeSending;
  }

  private static emptyInput(target: InputTarget, action: ISentInput["action"]): ISentInput {
    return { action, target, points: [], button: null, count: null, amount: null, text: null, key: null, modifiers: [] };
  }

  private static isSameTarget(left: InputTarget, right: InputTarget): boolean {
    return left.app.id === right.app.id && left.windowId === right.windowId && left.processId === right.processId;
  }
}
