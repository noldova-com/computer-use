/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendValueException, ComputerUseException } from "@noldova/computer-use.runtime";
import { PngHeaderLengthException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("PngHeaderLengthException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new PngHeaderLengthException(12);

    assert.equal(exception.message, "The capture's PNG header holds 12 bytes, not 13.");
    assert.equal(exception.length, 12);
    assert.equal(exception.name, "PngHeaderLengthException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new PngHeaderLengthException(12);

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
