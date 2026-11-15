/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IMacControlJson } from "./i-mac-control-json.ts";

export interface IMacControlSliceJson {
  readonly read: number;
  readonly controls: readonly IMacControlJson[];
  readonly leftOut: number;
  readonly timedOut: boolean;
  readonly isDone: boolean;
}
