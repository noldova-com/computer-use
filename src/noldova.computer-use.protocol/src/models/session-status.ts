/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SessionIdEmptyException } from "../exceptions/session-id-empty.exception.ts";
import { SessionIdMismatchException } from "../exceptions/session-id-mismatch.exception.ts";
import type { ISessionStatusJson } from "../interfaces/i-session-status-json.ts";
import { Resources } from "../resources.ts";
import { WireFormReader } from "../services/wire-form.reader.ts";
import { ControlState } from "./control-state.ts";

export class SessionStatus {
  public static readonly changedEvent: string = Resources.statusChangedEvent;
  public readonly sessionId: string | null;
  public readonly state: ControlState;

  public constructor(state: ControlState, sessionId: string | null) {
    if (state.isControlling !== (sessionId !== null))
      throw new SessionIdMismatchException(state, sessionId);
    if (sessionId === "")
      throw new SessionIdEmptyException();

    this.sessionId = sessionId;
    this.state = state;
  }

  public static fromJson(value: unknown): SessionStatus {
    const reader = WireFormReader.read(value, Resources.sessionStatusModel, [Resources.stateField, Resources.sessionIdField]);
    return new SessionStatus(ControlState.fromJson(reader.readString(Resources.stateField)), reader.readNullableString(Resources.sessionIdField));
  }

  public toJson(): ISessionStatusJson {
    return { state: this.state.toJson(), sessionId: this.sessionId };
  }
}
