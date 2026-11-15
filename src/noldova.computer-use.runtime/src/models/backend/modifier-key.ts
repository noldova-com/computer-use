/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ModifierKey {
  public static readonly Shift: ModifierKey = new ModifierKey("Shift");
  public static readonly Control: ModifierKey = new ModifierKey("Control");
  public static readonly Alt: ModifierKey = new ModifierKey("Alt");
  public static readonly Meta: ModifierKey = new ModifierKey("Meta");
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }
}
