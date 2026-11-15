/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ControlSpot } from "../../models/backend/control-spot.ts";
import type { ControlTree } from "../../models/backend/control-tree.ts";
import type { DesktopPoint } from "../../models/backend/desktop-point.ts";
import type { InputTarget } from "../../models/backend/input-target.ts";

export interface IControlBackend {
  readControlsAsync(target: InputTarget, underHandle: string | null, signal: AbortSignal): Promise<ControlTree>;
  findControlAsync(target: InputTarget, handle: string, signal: AbortSignal): Promise<ControlSpot | null>;
  isControlAtAsync(target: InputTarget, handle: string, at: DesktopPoint, signal: AbortSignal): Promise<boolean>;
}
