/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MacAnswerUnreadableException } from "../exceptions/mac-answer-unreadable.exception.ts";
import type { IMacAppDescriptionJson } from "../interfaces/i-mac-app-description-json.ts";
import type { IMacAppListJson } from "../interfaces/i-mac-app-list-json.ts";
import type { IMacBorderFrameJson } from "../interfaces/i-mac-border-frame-json.ts";
import type { IMacControlSliceJson } from "../interfaces/i-mac-control-slice-json.ts";
import type { IMacControlSpotJson } from "../interfaces/i-mac-control-spot-json.ts";
import type { IMacDisplayJson } from "../interfaces/i-mac-display-json.ts";
import type { IMacGlideStepJson } from "../interfaces/i-mac-glide-step-json.ts";
import type { IMacGrantsJson } from "../interfaces/i-mac-grants-json.ts";
import type { IMacOutcomeJson } from "../interfaces/i-mac-outcome-json.ts";
import type { IMacScriptChannel } from "../interfaces/i-mac-script-channel.ts";
import type { IMacStackedWindowJson } from "../interfaces/i-mac-stacked-window-json.ts";
import type { IMacTargetJson } from "../interfaces/i-mac-target-json.ts";
import type { IMacWindowJson } from "../interfaces/i-mac-window-json.ts";
import type { IMacWindowListJson } from "../interfaces/i-mac-window-list-json.ts";
import { Resources } from "../resources.ts";
import { MacAnswers } from "./mac-answers.ts";

export class MacDesktopApi {
  private readonly channel: IMacScriptChannel;
  private isWatching: boolean = false;

  public constructor(channel: IMacScriptChannel) {
    this.channel = channel;
  }

  public async checkGrantsAsync(): Promise<IMacGrantsJson> {
    return await this.readAsync(Resources.macScriptMethods.checkGrants, {}, MacAnswers.isGrants);
  }

  public async listDisplaysAsync(): Promise<readonly IMacDisplayJson[]> {
    return await this.readAsync(Resources.macScriptMethods.listDisplays, {}, MacAnswers.isDisplays);
  }

  public async showBorderAsync(frames: readonly IMacBorderFrameJson[], color: string): Promise<void> {
    await this.channel.callAsync(Resources.macScriptMethods.showBorder, { frames, color });
  }

  public async hideBorderAsync(): Promise<void> {
    await this.channel.callAsync(Resources.macScriptMethods.hideBorder, {});
  }

  public async getForegroundWindowAsync(): Promise<IMacWindowJson | null> {
    return await this.readAsync(Resources.macScriptMethods.getForegroundWindow, {}, MacAnswers.isWindowOrNull);
  }

  public async listWindowsAsync(): Promise<IMacWindowListJson> {
    return await this.readAsync(Resources.macScriptMethods.listWindows, {}, MacAnswers.isWindowList);
  }

  public async readWindowAsync(windowId: string): Promise<IMacStackedWindowJson | null> {
    return await this.readAsync(Resources.macScriptMethods.readWindow, { windowId }, MacAnswers.isStackedWindowOrNull);
  }

  public async listAppsAsync(hostPath: string): Promise<IMacAppListJson> {
    return await this.readAsync(Resources.macScriptMethods.listApps, { hostPath }, MacAnswers.isAppList);
  }

  public async describeBundleAsync(bundleId: string, iconSize: number): Promise<IMacAppDescriptionJson | null> {
    return await this.readAsync(Resources.macScriptMethods.describeBundle, { bundleId, iconSize }, MacAnswers.isAppDescriptionOrNull);
  }

  public async startWatchAsync(): Promise<void> {
    await this.channel.callAsync(Resources.macScriptMethods.startWatch, {});
    this.isWatching = true;
  }

  public async pollWatchAsync(): Promise<boolean> {
    return (await this.readAsync(Resources.macScriptMethods.pollWatch, {}, MacAnswers.isWatchPoll)).hasMoved;
  }

  public async stopWatchAsync(): Promise<void> {
    this.isWatching = false;
    await this.channel.callAsync(Resources.macScriptMethods.stopWatch, {});
  }

  public async readPointerAsync(): Promise<{ readonly x: number; readonly y: number }> {
    return await this.readAsync(Resources.macScriptMethods.readPointer, {}, MacAnswers.isPoint);
  }

  public async glidePointerAsync(target: IMacTargetJson, steps: readonly IMacGlideStepJson[], points: readonly { readonly x: number; readonly y: number }[]): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.glidePointer, { target, steps, points, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async movePointerAsync(target: IMacTargetJson, x: number, y: number): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.movePointer, { target, x, y, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async clickAsync(target: IMacTargetJson, x: number, y: number, button: string, count: number, modifiers: readonly string[]): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.click, { target, x, y, button, count, modifiers, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async dragAsync(target: IMacTargetJson, fromX: number, fromY: number, toX: number, toY: number, steps: readonly IMacGlideStepJson[], button: string, modifiers: readonly string[], stopPath: string): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.drag, { target, fromX, fromY, toX, toY, steps, button, modifiers, stopPath, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async scrollAsync(target: IMacTargetJson, x: number, y: number, deltaX: number, deltaY: number, modifiers: readonly string[]): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.scroll, { target, x, y, deltaX, deltaY, modifiers, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async typeTextAsync(target: IMacTargetJson, text: string): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.typeText, { target, text, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async pressKeyAsync(target: IMacTargetJson, key: string, modifiers: readonly string[]): Promise<IMacOutcomeJson> {
    return await this.readAsync(Resources.macScriptMethods.pressKey, { target, key, modifiers, watched: this.isWatching }, MacAnswers.isOutcome);
  }

  public async readControlsAsync(target: IMacTargetJson, underHandle: string | null, timeoutMs: number): Promise<IMacControlSliceJson> {
    return await this.readAsync(Resources.macScriptMethods.readControls, { target, underHandle, timeoutMs }, MacAnswers.isControlSlice);
  }

  public async continueControlsAsync(read: number): Promise<IMacControlSliceJson> {
    return await this.readAsync(Resources.macScriptMethods.continueControls, { read }, MacAnswers.isControlSlice);
  }

  public async findControlAsync(handle: string): Promise<IMacControlSpotJson | null> {
    return await this.readAsync(Resources.macScriptMethods.findControl, { handle }, MacAnswers.isControlSpotOrNull);
  }

  public async hitsControlAsync(handle: string, x: number, y: number, timeoutMs: number): Promise<boolean> {
    return await this.readAsync(Resources.macScriptMethods.hitsControl, { handle, x, y, timeoutMs }, MacAnswers.isBoolean);
  }

  private async readAsync<T>(method: string, parameters: object, isAnswer: (value: unknown) => value is T): Promise<T> {
    const answer = await this.channel.callAsync(method, parameters);
    if (!isAnswer(answer))
      throw new MacAnswerUnreadableException(method);

    return answer;
  }
}
