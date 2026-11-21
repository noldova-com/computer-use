/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  IWindowsAppPathsJson,
  IWindowsBorderFrameJson,
  IWindowsControlSpotJson,
  IWindowsControlTreeJson,
  IWindowsDesktopApi,
  IWindowsDisplayJson,
  IWindowsGlideStepJson,
  IWindowsImageJson,
  IWindowsOutcomeJson,
  IWindowsPointJson,
  IWindowsProgramJson,
  IWindowsTargetJson,
  IWindowsWindowJson,
  IWindowsWindowListJson
} from "@noldova/computer-use.runtime/windows";

export class WindowsDesktopApiDouble implements IWindowsDesktopApi {
  public appPaths: IWindowsAppPathsJson = { host: "C:\\Program Files\\Host\\host.exe", running: [], installed: [] };
  public controlSpot: IWindowsControlSpotJson | null = null;
  public controlTree: IWindowsControlTreeJson = { controls: [], leftOut: 0, timedOut: false };
  public controlWait: Promise<void> | null = null;
  public isControlHit: boolean = true;
  public readonly calls: { readonly name: string; readonly arguments: readonly unknown[] }[] = [];
  public displays: readonly IWindowsDisplayJson[] = [];
  public foreground: IWindowsWindowJson | null = null;
  public glideOutcome: IWindowsOutcomeJson = { status: "done" };
  public windowList: IWindowsWindowListJson = { isComplete: true, windows: [] };
  public icons: ReadonlyMap<string, IWindowsImageJson> = new Map();
  public image: IWindowsImageJson | null = { width: 1, height: 1, bgra: new ArrayBuffer(4) };
  public onHeartbeat: ((sequence: number) => void) | null = null;
  public onPhysicalInput: ((kind: number, processId: number) => void) | null = null;
  public outcome: IWindowsOutcomeJson = { status: "done" };
  public physicalCount: number = 0;
  public pointer: IWindowsPointJson = { x: 0, y: 0 };
  public programs: ReadonlyMap<string, IWindowsProgramJson> = new Map();

  public listDisplays(): readonly IWindowsDisplayJson[] {
    this.record("listDisplays");

    return this.displays;
  }

  public async captureWindow(windowId: string, x: number, y: number, width: number, height: number, timeoutMs: number): Promise<IWindowsImageJson | null> {
    this.record("captureWindow", windowId, x, y, width, height, timeoutMs);

    return this.image;
  }

  public getForegroundWindow(): IWindowsWindowJson | null {
    this.record("getForegroundWindow");

    return this.foreground;
  }

  public listWindows(): IWindowsWindowListJson {
    this.record("listWindows");

    return this.windowList;
  }

  public readPointer(): IWindowsPointJson {
    this.record("readPointer");

    return this.pointer;
  }

  public readPhysicalCount(): number {
    this.record("readPhysicalCount");

    return this.physicalCount;
  }

  public async glidePointer(target: IWindowsTargetJson, steps: readonly IWindowsGlideStepJson[], points: readonly IWindowsPointJson[], physicalBefore: number): Promise<IWindowsOutcomeJson> {
    this.record("glidePointer", target, steps, points, physicalBefore);

    return this.glideOutcome;
  }

  public movePointer(target: IWindowsTargetJson, x: number, y: number, physicalBefore: number): IWindowsOutcomeJson {
    return this.send("movePointer", target, x, y, physicalBefore);
  }

  public click(target: IWindowsTargetJson, x: number, y: number, button: string, count: number, modifiers: readonly string[], physicalBefore: number): IWindowsOutcomeJson {
    return this.send("click", target, x, y, button, count, modifiers, physicalBefore);
  }

  public async drag(target: IWindowsTargetJson, fromX: number, fromY: number, toX: number, toY: number, steps: readonly IWindowsGlideStepJson[], button: string, modifiers: readonly string[], stop: Int32Array, physicalBefore: number): Promise<IWindowsOutcomeJson> {
    return this.send("drag", target, fromX, fromY, toX, toY, steps, button, modifiers, stop, physicalBefore);
  }

  public scroll(target: IWindowsTargetJson, x: number, y: number, deltaX: number, deltaY: number, modifiers: readonly string[], physicalBefore: number): IWindowsOutcomeJson {
    return this.send("scroll", target, x, y, deltaX, deltaY, modifiers, physicalBefore);
  }

  public typeText(target: IWindowsTargetJson, text: string, focusMs: number): IWindowsOutcomeJson {
    return this.send("typeText", target, text, focusMs);
  }

  public pressKey(target: IWindowsTargetJson, key: string, modifiers: readonly string[], focusMs: number): IWindowsOutcomeJson {
    return this.send("pressKey", target, key, modifiers, focusMs);
  }

  public startMonitor(onPhysicalInput: (kind: number, processId: number) => void, onHeartbeat: (sequence: number) => void, intervalMs: number): void {
    this.record("startMonitor", intervalMs);
    this.onPhysicalInput = onPhysicalInput;
    this.onHeartbeat = onHeartbeat;
  }

  public stopMonitor(): void {
    this.record("stopMonitor");
  }

  public showBorder(frames: readonly IWindowsBorderFrameJson[], rgb: number): void {
    this.record("showBorder", frames, rgb);
  }

  public hideBorder(): void {
    this.record("hideBorder");
  }

  public listAppPaths(): IWindowsAppPathsJson {
    this.record("listAppPaths");

    return this.appPaths;
  }

  public describeProgram(programPath: string): IWindowsProgramJson {
    this.record("describeProgram", programPath);

    return this.programs.get(programPath) ?? { description: null, signer: null };
  }

  public readProgramIcon(programPath: string, size: number): IWindowsImageJson | null {
    this.record("readProgramIcon", programPath, size);

    return this.icons.get(programPath) ?? null;
  }

  public async readControls(target: IWindowsTargetJson, underHandle: string | null, timeoutMs: number): Promise<IWindowsControlTreeJson> {
    this.record("readControls", target, underHandle, timeoutMs);
    await this.controlWait;

    return this.controlTree;
  }

  public async findControl(target: IWindowsTargetJson, handle: string, timeoutMs: number): Promise<IWindowsControlSpotJson | null> {
    this.record("findControl", target, handle, timeoutMs);
    await this.controlWait;

    return this.controlSpot;
  }

  public async hitsControl(target: IWindowsTargetJson, handle: string, x: number, y: number, timeoutMs: number): Promise<boolean> {
    this.record("hitsControl", target, handle, x, y, timeoutMs);
    await this.controlWait;

    return this.isControlHit;
  }

  public named(name: string): readonly (readonly unknown[])[] {
    return this.calls.filter(t => t.name === name).map(t => t.arguments);
  }

  private send(name: string, ...values: unknown[]): IWindowsOutcomeJson {
    this.record(name, ...values);

    return this.outcome;
  }

  private record(name: string, ...values: unknown[]): void {
    this.calls.push({ name, arguments: values });
  }
}
