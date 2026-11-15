/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { AddonIncompleteException } from "../exceptions/addon-incomplete.exception.ts";
import { AddonLoadFailedException } from "../exceptions/addon-load-failed.exception.ts";
import { AddonMissingException } from "../exceptions/addon-missing.exception.ts";
import type { IWindowsAppPathsJson } from "../interfaces/i-windows-app-paths-json.ts";
import type { IWindowsBorderFrameJson } from "../interfaces/i-windows-border-frame-json.ts";
import type { IWindowsControlSpotJson } from "../interfaces/i-windows-control-spot-json.ts";
import type { IWindowsControlTreeJson } from "../interfaces/i-windows-control-tree-json.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import type { IWindowsDisplayJson } from "../interfaces/i-windows-display-json.ts";
import type { IWindowsGlideStepJson } from "../interfaces/i-windows-glide-step-json.ts";
import type { IWindowsImageJson } from "../interfaces/i-windows-image-json.ts";
import type { IWindowsOutcomeJson } from "../interfaces/i-windows-outcome-json.ts";
import type { IWindowsPointJson } from "../interfaces/i-windows-point-json.ts";
import type { IWindowsProgramJson } from "../interfaces/i-windows-program-json.ts";
import type { IWindowsTargetJson } from "../interfaces/i-windows-target-json.ts";
import type { IWindowsWindowJson } from "../interfaces/i-windows-window-json.ts";
import type { IWindowsWindowListJson } from "../interfaces/i-windows-window-list-json.ts";
import { Resources } from "../resources.ts";

export class WindowsDesktopApi implements IWindowsDesktopApi {
  public static readonly target: string = Resources.formatAddonTarget(process.platform, process.arch);
  public static readonly addonFile: string = fileURLToPath(new URL(Resources.formatWindowsAddonPath(WindowsDesktopApi.target), import.meta.url));

  private readonly file: string;
  private addon: IWindowsDesktopApi | null = null;

  public constructor(file: string) {
    this.file = file;
  }

  public listDisplays(): readonly IWindowsDisplayJson[] {
    return this.load().listDisplays();
  }

  public async captureWindow(windowId: string, x: number, y: number, width: number, height: number, timeoutMs: number): Promise<IWindowsImageJson | null> {
    return await this.load().captureWindow(windowId, x, y, width, height, timeoutMs);
  }

  public getForegroundWindow(): IWindowsWindowJson | null {
    return this.load().getForegroundWindow();
  }

  public listWindows(): IWindowsWindowListJson {
    return this.load().listWindows();
  }

  public readPointer(): IWindowsPointJson {
    return this.load().readPointer();
  }

  public async glidePointer(target: IWindowsTargetJson, steps: readonly IWindowsGlideStepJson[], points: readonly IWindowsPointJson[]): Promise<IWindowsOutcomeJson> {
    return await this.load().glidePointer(target, steps, points);
  }

  public movePointer(target: IWindowsTargetJson, x: number, y: number): IWindowsOutcomeJson {
    return this.load().movePointer(target, x, y);
  }

  public click(target: IWindowsTargetJson, x: number, y: number, button: string, count: number, modifiers: readonly string[]): IWindowsOutcomeJson {
    return this.load().click(target, x, y, button, count, modifiers);
  }

  public async drag(target: IWindowsTargetJson, fromX: number, fromY: number, toX: number, toY: number, steps: readonly IWindowsGlideStepJson[], button: string, modifiers: readonly string[], stop: Int32Array): Promise<IWindowsOutcomeJson> {
    return await this.load().drag(target, fromX, fromY, toX, toY, steps, button, modifiers, stop);
  }

  public scroll(target: IWindowsTargetJson, x: number, y: number, deltaX: number, deltaY: number, modifiers: readonly string[]): IWindowsOutcomeJson {
    return this.load().scroll(target, x, y, deltaX, deltaY, modifiers);
  }

  public typeText(target: IWindowsTargetJson, text: string, focusMs: number): IWindowsOutcomeJson {
    return this.load().typeText(target, text, focusMs);
  }

  public pressKey(target: IWindowsTargetJson, key: string, modifiers: readonly string[], focusMs: number): IWindowsOutcomeJson {
    return this.load().pressKey(target, key, modifiers, focusMs);
  }

  public startMonitor(onPhysicalInput: (kind: number, processId: number) => void, onHeartbeat: (sequence: number) => void, intervalMs: number): void {
    this.load().startMonitor(onPhysicalInput, onHeartbeat, intervalMs);
  }

  public stopMonitor(): void {
    this.load().stopMonitor();
  }

  public showBorder(frames: readonly IWindowsBorderFrameJson[], rgb: number): void {
    this.load().showBorder(frames, rgb);
  }

  public hideBorder(): void {
    this.load().hideBorder();
  }

  public listAppPaths(): IWindowsAppPathsJson {
    return this.load().listAppPaths();
  }

  public describeProgram(programPath: string): IWindowsProgramJson {
    return this.load().describeProgram(programPath);
  }

  public readProgramIcon(programPath: string, size: number): IWindowsImageJson | null {
    return this.load().readProgramIcon(programPath, size);
  }

  public async readControls(target: IWindowsTargetJson, underHandle: string | null, timeoutMs: number): Promise<IWindowsControlTreeJson> {
    return await this.load().readControls(target, underHandle, timeoutMs);
  }

  public async findControl(target: IWindowsTargetJson, handle: string, timeoutMs: number): Promise<IWindowsControlSpotJson | null> {
    return await this.load().findControl(target, handle, timeoutMs);
  }

  public async hitsControl(target: IWindowsTargetJson, handle: string, x: number, y: number, timeoutMs: number): Promise<boolean> {
    return await this.load().hitsControl(target, handle, x, y, timeoutMs);
  }

  private static isAddon(value: unknown): value is IWindowsDesktopApi {
    const members = typeof value === "object" && value !== null ? new Map<string, unknown>(Object.entries(value)) : new Map<string, unknown>();

    return Resources.windowsAddonFunctions.every(t => typeof members.get(t) === "function");
  }

  private load(): IWindowsDesktopApi {
    if (this.addon !== null)
      return this.addon;
    if (!existsSync(this.file))
      throw new AddonMissingException(this.file, WindowsDesktopApi.target);
    let addon: unknown;
    try {
      addon = createRequire(import.meta.url)(this.file);
    } catch (error) {
      throw new AddonLoadFailedException(this.file, error);
    }
    if (!WindowsDesktopApi.isAddon(addon))
      throw new AddonIncompleteException(this.file);

    this.addon = addon;
    return addon;
  }
}
