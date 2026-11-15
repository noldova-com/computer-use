/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Display } from "../models/display.ts";

export interface IDisplayBackend {
  listDisplaysAsync(signal: AbortSignal): Promise<readonly Display[]>;
}
