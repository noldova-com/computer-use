/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ControlState {
  public static readonly Focused: ControlState = new ControlState("Focused");
  public static readonly Disabled: ControlState = new ControlState("Disabled");
  public static readonly ReadOnly: ControlState = new ControlState("ReadOnly");
  public static readonly Checked: ControlState = new ControlState("Checked");
  public static readonly Mixed: ControlState = new ControlState("Mixed");
  public static readonly Selected: ControlState = new ControlState("Selected");
  public static readonly Expanded: ControlState = new ControlState("Expanded");
  public static readonly Collapsed: ControlState = new ControlState("Collapsed");
  public static readonly Password: ControlState = new ControlState("Password");
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }
}
