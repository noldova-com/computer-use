/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class PhysicalInputKind {
  public static readonly Pointer: PhysicalInputKind = new PhysicalInputKind("Pointer");
  public static readonly Keyboard: PhysicalInputKind = new PhysicalInputKind("Keyboard");
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }
}
