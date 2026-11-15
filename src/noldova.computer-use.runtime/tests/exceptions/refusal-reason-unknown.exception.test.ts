/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendValueException, ComputerUseException, RefusalReasonUnknownException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("RefusalReasonUnknownException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new RefusalReasonUnknownException("asleep");

    assert.equal(exception.message, "\"asleep\" is not a refusal reason.");
    assert.equal(exception.value, "asleep");
    assert.equal(exception.name, "RefusalReasonUnknownException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new RefusalReasonUnknownException("asleep");

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
