/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ComputerUseException } from "./computer-use.exception.ts";

export class MonitorRunningException extends ComputerUseException {
  public constructor() {
    super(Resources.monitorAlreadyRunning);
  }
}
