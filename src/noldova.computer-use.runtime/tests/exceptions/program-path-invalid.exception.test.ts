/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendValueException, ComputerUseException, ProgramPathInvalidException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("ProgramPathInvalidException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new ProgramPathInvalidException("sample.exe");

    assert.equal(exception.message, "The program path \"sample.exe\" must be a full path to a file, from a drive or a network share.");
    assert.equal(exception.programPath, "sample.exe");
    assert.equal(exception.name, "ProgramPathInvalidException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new ProgramPathInvalidException("sample.exe");

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
