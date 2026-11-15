/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IWindowsAppPathsJson } from "./i-windows-app-paths-json.ts";
import type { IWindowsBorderFrameJson } from "./i-windows-border-frame-json.ts";
import type { IWindowsControlSpotJson } from "./i-windows-control-spot-json.ts";
import type { IWindowsControlTreeJson } from "./i-windows-control-tree-json.ts";
import type { IWindowsDisplayJson } from "./i-windows-display-json.ts";
import type { IWindowsGlideStepJson } from "./i-windows-glide-step-json.ts";
import type { IWindowsImageJson } from "./i-windows-image-json.ts";
import type { IWindowsOutcomeJson } from "./i-windows-outcome-json.ts";
import type { IWindowsPointJson } from "./i-windows-point-json.ts";
import type { IWindowsProgramJson } from "./i-windows-program-json.ts";
import type { IWindowsTargetJson } from "./i-windows-target-json.ts";
import type { IWindowsWindowJson } from "./i-windows-window-json.ts";
import type { IWindowsWindowListJson } from "./i-windows-window-list-json.ts";

export interface IWindowsDesktopApi {
  listDisplays(): readonly IWindowsDisplayJson[];
  captureWindow(windowId: string, x: number, y: number, width: number, height: number, timeoutMs: number): Promise<IWindowsImageJson | null>;
  getForegroundWindow(): IWindowsWindowJson | null;
  listWindows(): IWindowsWindowListJson;
  readPointer(): IWindowsPointJson;
  glidePointer(target: IWindowsTargetJson, steps: readonly IWindowsGlideStepJson[], points: readonly IWindowsPointJson[]): Promise<IWindowsOutcomeJson>;
  movePointer(target: IWindowsTargetJson, x: number, y: number): IWindowsOutcomeJson;
  click(target: IWindowsTargetJson, x: number, y: number, button: string, count: number, modifiers: readonly string[]): IWindowsOutcomeJson;
  drag(target: IWindowsTargetJson, fromX: number, fromY: number, toX: number, toY: number, steps: readonly IWindowsGlideStepJson[], button: string, modifiers: readonly string[], stop: Int32Array): Promise<IWindowsOutcomeJson>;
  scroll(target: IWindowsTargetJson, x: number, y: number, deltaX: number, deltaY: number, modifiers: readonly string[]): IWindowsOutcomeJson;
  typeText(target: IWindowsTargetJson, text: string, focusMs: number): IWindowsOutcomeJson;
  pressKey(target: IWindowsTargetJson, key: string, modifiers: readonly string[], focusMs: number): IWindowsOutcomeJson;
  startMonitor(onPhysicalInput: (kind: number, processId: number) => void, onHeartbeat: (sequence: number) => void, intervalMs: number): void;
  stopMonitor(): void;
  showBorder(frames: readonly IWindowsBorderFrameJson[], rgb: number): void;
  hideBorder(): void;
  listAppPaths(): IWindowsAppPathsJson;
  describeProgram(programPath: string): IWindowsProgramJson;
  readProgramIcon(programPath: string, size: number): IWindowsImageJson | null;
  readControls(target: IWindowsTargetJson, underHandle: string | null, timeoutMs: number): Promise<IWindowsControlTreeJson>;
  findControl(target: IWindowsTargetJson, handle: string, timeoutMs: number): Promise<IWindowsControlSpotJson | null>;
  hitsControl(target: IWindowsTargetJson, handle: string, x: number, y: number, timeoutMs: number): Promise<boolean>;
}
