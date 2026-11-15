/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ControlState } from "../models/control-state.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class SessionIdMismatchException extends ProtocolException {
  public override readonly name: string = "SessionIdMismatchException";
  public readonly sessionId: string | null;
  public readonly state: ControlState;

  public constructor(state: ControlState, sessionId: string | null) {
    super(Resources.formatSessionIdMismatch(state.value));

    this.sessionId = sessionId;
    this.state = state;
  }
}
