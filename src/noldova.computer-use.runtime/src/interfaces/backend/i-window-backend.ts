/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { WindowInfo } from "../../models/backend/window-info.ts";
import type { WindowStack } from "../../models/backend/window-stack.ts";

export interface IWindowBackend {
  getForegroundWindowAsync(signal: AbortSignal): Promise<WindowInfo | null>;
  listStackAsync(signal: AbortSignal): Promise<WindowStack>;
}
