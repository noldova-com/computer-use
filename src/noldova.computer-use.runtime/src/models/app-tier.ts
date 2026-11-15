/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ClickCount } from "./backend/click-count.ts";
import type { ModifierKey } from "./backend/modifier-key.ts";
import { PointerButton } from "./backend/pointer-button.ts";
import { InputKind } from "./input-kind.ts";

export class AppTier {
  public static readonly ViewOnly: AppTier = new AppTier("ViewOnly", []);
  public static readonly ClickOnly: AppTier = new AppTier("ClickOnly", [InputKind.Click, InputKind.Scroll]);
  public static readonly Full: AppTier = new AppTier("Full", InputKind.all);
  private readonly allowed: readonly InputKind[];

  public readonly value: string;

  private constructor(value: string, allowed: readonly InputKind[]) {
    this.allowed = allowed;
    this.value = value;
  }

  public allows(kind: InputKind): boolean {
    return this.allowed.includes(kind);
  }

  public allowsClick(button: PointerButton, count: ClickCount, modifiers: readonly ModifierKey[]): boolean {
    if (this !== AppTier.ClickOnly)
      return this.allows(InputKind.Click);

    return button !== PointerButton.Right && count !== ClickCount.Triple && modifiers.length === 0;
  }
}
