/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, SessionIdEmptyException } from "@noldova/computer-use.protocol";

describe("SessionIdEmptyException", () => {
  it("says a session ID must not be empty", () => {
    const error = new SessionIdEmptyException();

    assert.ok(error instanceof ProtocolException);
    assert.equal(error.name, "SessionIdEmptyException");
    assert.equal(error.message, "A session ID must not be empty.");
  });
});
