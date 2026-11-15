/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState, ProtocolException, SessionStatus } from "@noldova/computer-use.protocol";
import { Exception, ExceptionOptions } from "@noldova/context.exceptions";

class RefusedException extends ProtocolException {
  public constructor(message: string, options?: ExceptionOptions) {
    super(message, options);
  }
}

describe("ProtocolException", () => {
  it("is an exception named after its class, with the message and cause it is given", () => {
    const cause = new Error("unreadable");
    const error = new RefusedException("Refused.", new ExceptionOptions(cause));

    assert.ok(error instanceof Exception);
    assert.equal(error.name, "ProtocolException");
    assert.equal(error.message, "Refused.");
    assert.equal(error.cause, cause);
  });

  it("is the base of every refusal a model throws", () => {
    assert.throws(() => ControlState.fromJson("Paused"), ProtocolException);
    assert.throws(() => new SessionStatus(ControlState.Idle, "session-1"), ProtocolException);
  });
});
