/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class IconColor {
  public static readonly CLEAR: IconColor = new IconColor(0, 0, 0, 0);
  public static readonly LIGHT: IconColor = new IconColor(242, 242, 242, 255);
  public static readonly TEMPLATE: IconColor = new IconColor(0, 0, 0, 255);
  public static readonly ACCENT: IconColor = new IconColor(0, 95, 184, 255);

  public readonly red: number;
  public readonly green: number;
  public readonly blue: number;
  public readonly alpha: number;

  public constructor(red: number, green: number, blue: number, alpha: number) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha;
  }
}
