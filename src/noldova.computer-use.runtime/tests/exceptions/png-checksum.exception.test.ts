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
import { PngChecksumException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("PngChecksumException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new PngChecksumException("IDAT");

    assert.equal(exception.message, "The capture's PNG chunk IDAT fails its checksum.");
    assert.equal(exception.chunkType, "IDAT");
    assert.equal(exception.name, "PngChecksumException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new PngChecksumException("IDAT");

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
