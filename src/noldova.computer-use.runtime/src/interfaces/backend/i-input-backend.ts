/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ClickCount } from "../../models/backend/click-count.ts";
import type { DesktopPoint } from "../../models/backend/desktop-point.ts";
import type { InputTarget } from "../../models/backend/input-target.ts";
import type { KeyName } from "../../models/backend/key-name.ts";
import type { ModifierKey } from "../../models/backend/modifier-key.ts";
import type { PointerButton } from "../../models/backend/pointer-button.ts";
import type { ScrollAmount } from "../../models/backend/scroll-amount.ts";

export interface IInputBackend {
  readonly maxTextChunkLength: number;
  readPointerAsync(signal: AbortSignal): Promise<DesktopPoint>;
  glidePointerAsync(target: InputTarget, to: DesktopPoint, points: readonly DesktopPoint[], signal: AbortSignal): Promise<void>;
  movePointerAsync(target: InputTarget, to: DesktopPoint, signal: AbortSignal): Promise<void>;
  clickAsync(target: InputTarget, at: DesktopPoint, button: PointerButton, count: ClickCount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;
  dragAsync(target: InputTarget, from: DesktopPoint, to: DesktopPoint, button: PointerButton, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;
  scrollAsync(target: InputTarget, at: DesktopPoint, amount: ScrollAmount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;
  typeTextAsync(target: InputTarget, chunk: string, signal: AbortSignal): Promise<void>;
  pressKeyAsync(target: InputTarget, key: KeyName, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;
  isSystemCombination(key: KeyName, modifiers: readonly ModifierKey[]): boolean;
}
