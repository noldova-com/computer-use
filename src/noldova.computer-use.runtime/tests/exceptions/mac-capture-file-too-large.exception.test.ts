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
import { MacCaptureFileTooLargeException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacCaptureFileTooLargeException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new MacCaptureFileTooLargeException(536_870_913);

    assert.equal(exception.message, "The capture file holds 536870913 bytes, more than the 536870912 a capture can have.");
    assert.equal(exception.size, 536_870_913);
    assert.equal(exception.name, "MacCaptureFileTooLargeException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new MacCaptureFileTooLargeException(536_870_913);

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
