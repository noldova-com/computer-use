/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendAnswerInvalidException, BackendValueException, ComputerUseException } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException, Exception } from "@noldova/context.exceptions";

describe("BackendAnswerInvalidException", () => {
  it("carries its message, its facts, its cause and its name", () => {
    const value = { x: 0.5, y: 4 };
    const cause = new ArgumentOutOfRangeException("x", 0.5, "The point must be whole.");
    const exception = new BackendAnswerInvalidException("readPointer", value, cause);

    assert.equal(exception.message, "The desktop answered readPointer with a value the module can't use: The point must be whole. (Parameter 'x')");
    assert.equal(exception.answer, "readPointer");
    assert.equal(exception.value, value);
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "BackendAnswerInvalidException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new BackendAnswerInvalidException("readPointer", {}, new ArgumentOutOfRangeException("x"));

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
