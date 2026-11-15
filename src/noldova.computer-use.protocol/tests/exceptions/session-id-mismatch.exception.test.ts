/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState, ProtocolException, SessionIdMismatchException } from "@noldova/computer-use.protocol";

describe("SessionIdMismatchException", () => {
  it("keeps the state and the session ID and names the state in its message", () => {
    const error = new SessionIdMismatchException(ControlState.Idle, "session-1");

    assert.ok(error instanceof ProtocolException);
    assert.equal(error.name, "SessionIdMismatchException");
    assert.equal(error.state, ControlState.Idle);
    assert.equal(error.sessionId, "session-1");
    assert.equal(error.message, "A session ID is given exactly when the state is Controlling; the state is Idle.");
  });

  it("keeps a missing session ID as null", () => {
    assert.equal(new SessionIdMismatchException(ControlState.Controlling, null).sessionId, null);
  });
});
