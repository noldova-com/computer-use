/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BorderFrame } from "../../models/backend/border-frame.ts";
import type { Display } from "../../models/display.ts";

export interface IBorderBackend {
  unitsPerPixel(display: Display): number;
  showAsync(frames: readonly BorderFrame[], color: string, signal: AbortSignal): Promise<void>;
  hideAsync(signal: AbortSignal): Promise<void>;
}
