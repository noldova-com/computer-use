/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ControlRole } from "./control-role.ts";
import type { DesktopPoint } from "./desktop-point.ts";

export class ControlSpot {
  public readonly isEnabled: boolean;
  public readonly isOnScreen: boolean;
  public readonly name: string;
  public readonly point: DesktopPoint;
  public readonly role: ControlRole;

  public constructor(role: ControlRole, name: string, isEnabled: boolean, isOnScreen: boolean, point: DesktopPoint) {
    this.isEnabled = isEnabled;
    this.isOnScreen = isOnScreen;
    this.name = name;
    this.point = point;
    this.role = role;
  }
}
