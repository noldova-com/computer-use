/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ClickCount, DesktopPoint, InputTarget, KeyName, ModifierKey, PointerButton, ScrollAmount } from "@noldova/computer-use.runtime";

export interface ISentInput {
  readonly action: "move" | "click" | "drag" | "scroll" | "type" | "press";
  readonly target: InputTarget;
  readonly points: readonly DesktopPoint[];
  readonly button: PointerButton | null;
  readonly count: ClickCount | null;
  readonly amount: ScrollAmount | null;
  readonly text: string | null;
  readonly key: KeyName | null;
  readonly modifiers: readonly ModifierKey[];
}
