/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlStateUnknownException, ProtocolException } from "@noldova/computer-use.protocol";

describe("ControlStateUnknownException", () => {
  it("keeps the value as given and quotes it as text in its message", () => {
    const error = new ControlStateUnknownException(0);

    assert.ok(error instanceof ProtocolException);
    assert.equal(error.name, "ControlStateUnknownException");
    assert.equal(error.value, 0);
    assert.equal(error.message, "\"0\" is not a known control state.");
  });
});
