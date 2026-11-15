/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IMacStackedWindowJson } from "./i-mac-stacked-window-json.ts";

export interface IMacWindowListJson {
  readonly isComplete: boolean;
  readonly windows: readonly IMacStackedWindowJson[];
}
