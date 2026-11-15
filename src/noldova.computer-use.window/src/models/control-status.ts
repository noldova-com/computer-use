/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { SessionStatus } from "@noldova/computer-use.protocol";

export class ControlStatus {
  public readonly canStop: boolean;

  public constructor(status: SessionStatus) {
    this.canStop = status.state.isControlling;
  }
}
