/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IWindowsControlJson } from "./i-windows-control-json.ts";

export interface IWindowsControlTreeJson {
  readonly controls: readonly IWindowsControlJson[];
  readonly leftOut: number;
  readonly timedOut: boolean;
}
