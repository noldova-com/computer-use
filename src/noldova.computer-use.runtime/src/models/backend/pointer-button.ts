/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class PointerButton {
  public static readonly Left: PointerButton = new PointerButton("Left");
  public static readonly Right: PointerButton = new PointerButton("Right");
  public static readonly Middle: PointerButton = new PointerButton("Middle");
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }
}
