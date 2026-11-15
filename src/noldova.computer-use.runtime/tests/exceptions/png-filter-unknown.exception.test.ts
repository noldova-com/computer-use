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
import { PngFilterUnknownException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("PngFilterUnknownException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new PngFilterUnknownException(7);

    assert.equal(exception.message, "The capture's PNG file uses the unknown row filter 7.");
    assert.equal(exception.filter, 7);
    assert.equal(exception.name, "PngFilterUnknownException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new PngFilterUnknownException(7);

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
