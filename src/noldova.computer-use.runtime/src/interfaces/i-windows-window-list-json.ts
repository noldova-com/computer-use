/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IWindowsStackedWindowJson } from "./i-windows-stacked-window-json.ts";

export interface IWindowsWindowListJson {
  readonly isComplete: boolean;
  readonly windows: readonly IWindowsStackedWindowJson[];
}
