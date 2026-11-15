/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";
import type { IModuleLog } from "@noldova/desktop.runtime";

import { MacStopFolderFailedException } from "../exceptions/mac-stop-folder-failed.exception.ts";
import { RefusalException } from "../exceptions/refusal.exception.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IMacGlideStepJson } from "../interfaces/i-mac-glide-step-json.ts";
import type { IMacOutcomeJson } from "../interfaces/i-mac-outcome-json.ts";
import type { IMacTargetJson } from "../interfaces/i-mac-target-json.ts";
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
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacInputBackend implements IInputBackend {
  private static readonly SYSTEM_COMBINATIONS: readonly (readonly [KeyName, readonly ModifierKey[]])[] = [
    [KeyName.Tab, [ModifierKey.Meta]],
    [KeyName.Tab, [ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.Space, [ModifierKey.Meta]],
    [KeyName.Space, [ModifierKey.Control]],
    [KeyName.Q, [ModifierKey.Meta]],
    [KeyName.H, [ModifierKey.Meta]],
    [KeyName.Escape, [ModifierKey.Meta, ModifierKey.Alt]],
    [KeyName.Q, [ModifierKey.Control, ModifierKey.Meta]],
    [KeyName.Q, [ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.Q, [ModifierKey.Meta, ModifierKey.Alt, ModifierKey.Shift]],
    [KeyName.Digit3, [ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.Digit4, [ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.Digit5, [ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.Digit3, [ModifierKey.Control, ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.Digit4, [ModifierKey.Control, ModifierKey.Meta, ModifierKey.Shift]],
    [KeyName.D, [ModifierKey.Meta, ModifierKey.Alt]],
    [KeyName.F11, []],
    [KeyName.Up, [ModifierKey.Control]],
    [KeyName.Down, [ModifierKey.Control]],
    [KeyName.Left, [ModifierKey.Control]],
    [KeyName.Right, [ModifierKey.Control]]
  ];

  private readonly api: MacDesktopApi;
  private readonly log: IModuleLog;
  private readonly stopFolder: string;

  public readonly maxTextChunkLength: number = Resources.macMaxTextChunkLength;

  public constructor(api: MacDesktopApi, stopFolder: string, log: IModuleLog) {
    this.api = api;
    this.log = log;
    this.stopFolder = stopFolder;
  }

  public async readPointerAsync(signal: AbortSignal): Promise<DesktopPoint> {
    signal.throwIfAborted();
    const pointer = await this.api.readPointerAsync();
    return BackendAnswers.read(Resources.macScriptMethods.readPointer, pointer, () => new DesktopPoint(Math.round(pointer.x), Math.round(pointer.y)));
  }

  public async movePointerAsync(target: InputTarget, to: DesktopPoint, signal: AbortSignal): Promise<void> {
    await this.glidePointerAsync(target, to, [to], signal);
    signal.throwIfAborted();
    MacInputBackend.settle(await this.api.movePointerAsync(MacInputBackend.toTarget(target), to.x, to.y));
  }

  public async clickAsync(target: InputTarget, at: DesktopPoint, button: PointerButton, count: ClickCount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    await this.glidePointerAsync(target, at, [at], signal);
    signal.throwIfAborted();
    MacInputBackend.settle(await this.api.clickAsync(MacInputBackend.toTarget(target), at.x, at.y, button.value, count.count, modifiers.map(t => t.value)));
  }

  public async dragAsync(target: InputTarget, from: DesktopPoint, to: DesktopPoint, button: PointerButton, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    await this.glidePointerAsync(target, from, [from, to], signal);
    signal.throwIfAborted();
    const steps = MacInputBackend.toSteps(GlidePath.between(from, to));
    const stopPath = await this.prepareStopAsync();
    signal.throwIfAborted();
    const stops: Promise<void>[] = [];
    const end = (): void => {
      stops.push(writeFile(stopPath, "", { mode: Resources.privateFileMode }).catch((error: unknown) => this.log.write(Resources.formatStopFileFailed(String(error)))));
    };
    signal.addEventListener("abort", end, { once: true });
    let outcome: IMacOutcomeJson;
    try {
      outcome = await this.api.dragAsync(MacInputBackend.toTarget(target), from.x, from.y, to.x, to.y, steps, button.value, modifiers.map(t => t.value), stopPath);
    } finally {
      signal.removeEventListener("abort", end);
      await Promise.all(stops);
      await rm(stopPath, { force: true }).catch((error: unknown) => {
        if (!BackendFailures.isSystemError(error))
          throw error;

        this.log.write(Resources.formatStopFileLeft(String(error)));
      });
    }
    if (outcome.status === Resources.stoppedStatus && outcome.inputSent !== true)
      signal.throwIfAborted();
    MacInputBackend.settle(outcome);
  }

  public async scrollAsync(target: InputTarget, at: DesktopPoint, amount: ScrollAmount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    await this.glidePointerAsync(target, at, [at], signal);
    signal.throwIfAborted();
    MacInputBackend.settle(await this.api.scrollAsync(MacInputBackend.toTarget(target), at.x, at.y, amount.x, amount.y, modifiers.map(t => t.value)));
  }

  public async typeTextAsync(target: InputTarget, chunk: string, signal: AbortSignal): Promise<void> {
    if (chunk.length === 0 || chunk.length > this.maxTextChunkLength)
      throw new ArgumentOutOfRangeException(Resources.chunkParameterName, chunk.length, Resources.formatInvalidTextChunk(chunk.length, this.maxTextChunkLength));

    signal.throwIfAborted();
    MacInputBackend.settle(await this.api.typeTextAsync(MacInputBackend.toTarget(target), chunk));
  }

  public async pressKeyAsync(target: InputTarget, key: KeyName, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    MacInputBackend.settle(await this.api.pressKeyAsync(MacInputBackend.toTarget(target), key.value, modifiers.map(t => t.value)));
  }

  public isSystemCombination(key: KeyName, modifiers: readonly ModifierKey[]): boolean {
    return MacInputBackend.SYSTEM_COMBINATIONS.some(([systemKey, held]) => systemKey === key && held.length === modifiers.length && held.every(t => modifiers.includes(t)));
  }

  public async glidePointerAsync(target: InputTarget, to: DesktopPoint, points: readonly DesktopPoint[], signal: AbortSignal): Promise<void> {
    let from: DesktopPoint;
    try {
      from = await this.readPointerAsync(signal);
    } catch (error) {
      if (signal.aborted || !BackendFailures.isBackendFailure(error))
        throw error;

      return;
    }
    const path = GlidePath.between(from, to);
    if (path.steps.length === 0)
      return;

    signal.throwIfAborted();
    const outcome = await this.api.glidePointerAsync(MacInputBackend.toTarget(target), MacInputBackend.toSteps(path), points.map(t => ({ x: t.x, y: t.y })));
    MacInputBackend.settle(outcome);
  }

  private async prepareStopAsync(): Promise<string> {
    try {
      await mkdir(this.stopFolder, { recursive: true, mode: Resources.privateFolderMode });
      await chmod(this.stopFolder, Resources.privateFolderMode);
    } catch (error) {
      if (!BackendFailures.isSystemError(error))
        throw error;

      throw new MacStopFolderFailedException(this.stopFolder, error);
    }

    return path.join(this.stopFolder, randomUUID());
  }

  private static settle(outcome: IMacOutcomeJson): void {
    if (outcome.status === Resources.refusedStatus)
      throw new RefusalException(RefusalReason.parse(outcome.reason ?? ""), outcome.inputSent === true);
  }

  private static toSteps(path: GlidePath): readonly IMacGlideStepJson[] {
    return path.steps.map(t => ({ x: t.point.x, y: t.point.y, atMs: t.atMs }));
  }

  private static toTarget(target: InputTarget): IMacTargetJson {
    return { windowId: target.windowId, processId: target.processId, bundleId: target.app.id };
  }
}
