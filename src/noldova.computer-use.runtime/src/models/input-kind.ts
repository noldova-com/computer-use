/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class InputKind {
  public static readonly Click: InputKind = new InputKind("Click", Resources.clickInputName);
  public static readonly Scroll: InputKind = new InputKind("Scroll", Resources.scrollInputName);
  public static readonly Move: InputKind = new InputKind("Move", Resources.moveInputName);
  public static readonly Drag: InputKind = new InputKind("Drag", Resources.dragInputName);
  public static readonly Type: InputKind = new InputKind("Type", Resources.typeInputName);
  public static readonly Key: InputKind = new InputKind("Key", Resources.keyInputName);
  public static readonly all: readonly InputKind[] = [
    InputKind.Click,
    InputKind.Scroll,
    InputKind.Move,
    InputKind.Drag,
    InputKind.Type,
    InputKind.Key
  ];
  public readonly inputName: string;
  public readonly value: string;

  private constructor(value: string, inputName: string) {
    this.inputName = inputName;
    this.value = value;
  }
}
