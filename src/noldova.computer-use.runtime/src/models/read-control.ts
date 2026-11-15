/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ControlRole } from "./backend/control-role.ts";
import type { DesktopRect } from "./backend/desktop-rect.ts";

export class ReadControl {
  public readonly bounds: DesktopRect;
  public readonly handle: string;
  public readonly id: string;
  public readonly name: string;
  public readonly role: ControlRole;

  public constructor(id: string, handle: string, role: ControlRole, name: string, bounds: DesktopRect) {
    this.bounds = bounds;
    this.handle = handle;
    this.id = id;
    this.name = name;
    this.role = role;
  }
}
