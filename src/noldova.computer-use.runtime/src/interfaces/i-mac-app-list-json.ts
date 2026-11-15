/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IMacAppJson } from "./i-mac-app-json.ts";

export interface IMacAppListJson {
  readonly host: string;
  readonly running: readonly IMacAppJson[];
  readonly installed: readonly IMacAppJson[];
}
