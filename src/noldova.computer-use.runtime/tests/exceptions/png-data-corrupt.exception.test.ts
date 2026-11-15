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
import { PngDataCorruptException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("PngDataCorruptException", () => {
  it("carries its message, its cause and its name", () => {
    const cause = new Error("incorrect header check");
    const exception = new PngDataCorruptException(cause);

    assert.equal(exception.message, "The capture's PNG pixel data can't be inflated.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "PngDataCorruptException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new PngDataCorruptException(new Error("incorrect header check"));

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
