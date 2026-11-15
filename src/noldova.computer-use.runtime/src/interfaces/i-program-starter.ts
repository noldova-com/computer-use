/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IModuleLog, OwnedProcess, ProcessRequest } from "@noldova/desktop.runtime";

export interface IProgramStarter {
  readonly log: IModuleLog;

  startProcessAsync(request: ProcessRequest): Promise<OwnedProcess>;
}
