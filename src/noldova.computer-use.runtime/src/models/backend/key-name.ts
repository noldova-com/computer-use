/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";

export class KeyName {
  public static readonly Enter: KeyName = new KeyName("Enter");
  public static readonly Tab: KeyName = new KeyName("Tab");
  public static readonly Escape: KeyName = new KeyName("Escape");
  public static readonly Backspace: KeyName = new KeyName("Backspace");
  public static readonly Delete: KeyName = new KeyName("Delete");
  public static readonly Space: KeyName = new KeyName("Space");
  public static readonly Up: KeyName = new KeyName("Up");
  public static readonly Down: KeyName = new KeyName("Down");
  public static readonly Left: KeyName = new KeyName("Left");
  public static readonly Right: KeyName = new KeyName("Right");
  public static readonly Home: KeyName = new KeyName("Home");
  public static readonly End: KeyName = new KeyName("End");
  public static readonly PageUp: KeyName = new KeyName("PageUp");
  public static readonly PageDown: KeyName = new KeyName("PageDown");
  public static readonly F1: KeyName = new KeyName("F1");
  public static readonly F2: KeyName = new KeyName("F2");
  public static readonly F3: KeyName = new KeyName("F3");
  public static readonly F4: KeyName = new KeyName("F4");
  public static readonly F5: KeyName = new KeyName("F5");
  public static readonly F6: KeyName = new KeyName("F6");
  public static readonly F7: KeyName = new KeyName("F7");
  public static readonly F8: KeyName = new KeyName("F8");
  public static readonly F9: KeyName = new KeyName("F9");
  public static readonly F10: KeyName = new KeyName("F10");
  public static readonly F11: KeyName = new KeyName("F11");
  public static readonly F12: KeyName = new KeyName("F12");
  public static readonly A: KeyName = new KeyName("A");
  public static readonly B: KeyName = new KeyName("B");
  public static readonly C: KeyName = new KeyName("C");
  public static readonly D: KeyName = new KeyName("D");
  public static readonly E: KeyName = new KeyName("E");
  public static readonly F: KeyName = new KeyName("F");
  public static readonly G: KeyName = new KeyName("G");
  public static readonly H: KeyName = new KeyName("H");
  public static readonly I: KeyName = new KeyName("I");
  public static readonly J: KeyName = new KeyName("J");
  public static readonly K: KeyName = new KeyName("K");
  public static readonly L: KeyName = new KeyName("L");
  public static readonly M: KeyName = new KeyName("M");
  public static readonly N: KeyName = new KeyName("N");
  public static readonly O: KeyName = new KeyName("O");
  public static readonly P: KeyName = new KeyName("P");
  public static readonly Q: KeyName = new KeyName("Q");
  public static readonly R: KeyName = new KeyName("R");
  public static readonly S: KeyName = new KeyName("S");
  public static readonly T: KeyName = new KeyName("T");
  public static readonly U: KeyName = new KeyName("U");
  public static readonly V: KeyName = new KeyName("V");
  public static readonly W: KeyName = new KeyName("W");
  public static readonly X: KeyName = new KeyName("X");
  public static readonly Y: KeyName = new KeyName("Y");
  public static readonly Z: KeyName = new KeyName("Z");
  public static readonly Digit0: KeyName = new KeyName("Digit0");
  public static readonly Digit1: KeyName = new KeyName("Digit1");
  public static readonly Digit2: KeyName = new KeyName("Digit2");
  public static readonly Digit3: KeyName = new KeyName("Digit3");
  public static readonly Digit4: KeyName = new KeyName("Digit4");
  public static readonly Digit5: KeyName = new KeyName("Digit5");
  public static readonly Digit6: KeyName = new KeyName("Digit6");
  public static readonly Digit7: KeyName = new KeyName("Digit7");
  public static readonly Digit8: KeyName = new KeyName("Digit8");
  public static readonly Digit9: KeyName = new KeyName("Digit9");
  public static readonly all: readonly KeyName[] = [
    KeyName.Enter, KeyName.Tab, KeyName.Escape, KeyName.Backspace, KeyName.Delete, KeyName.Space,
    KeyName.Up, KeyName.Down, KeyName.Left, KeyName.Right, KeyName.Home, KeyName.End, KeyName.PageUp, KeyName.PageDown,
    KeyName.F1, KeyName.F2, KeyName.F3, KeyName.F4, KeyName.F5, KeyName.F6, KeyName.F7, KeyName.F8, KeyName.F9, KeyName.F10, KeyName.F11, KeyName.F12,
    KeyName.A, KeyName.B, KeyName.C, KeyName.D, KeyName.E, KeyName.F, KeyName.G, KeyName.H, KeyName.I, KeyName.J, KeyName.K, KeyName.L, KeyName.M,
    KeyName.N, KeyName.O, KeyName.P, KeyName.Q, KeyName.R, KeyName.S, KeyName.T, KeyName.U, KeyName.V, KeyName.W, KeyName.X, KeyName.Y, KeyName.Z,
    KeyName.Digit0, KeyName.Digit1, KeyName.Digit2, KeyName.Digit3, KeyName.Digit4, KeyName.Digit5, KeyName.Digit6, KeyName.Digit7, KeyName.Digit8, KeyName.Digit9
  ];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static parse(value: string): KeyName {
    const key = KeyName.all.find(t => t.value === value);
    if (key === undefined)
      throw new ArgumentOutOfRangeException(Resources.valueParameterName, value, Resources.formatUnknownKeyName(value));

    return key;
  }
}
