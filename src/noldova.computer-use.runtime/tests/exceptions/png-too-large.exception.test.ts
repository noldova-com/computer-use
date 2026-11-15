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
import { PngTooLargeException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("PngTooLargeException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new PngTooLargeException(8193, 8192);

    assert.equal(exception.message, "The capture's PNG file is 8193 by 8192 pixels, more than the 67108864 pixels a capture can have.");
    assert.deepEqual([exception.width, exception.height], [8193, 8192]);
    assert.equal(exception.name, "PngTooLargeException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new PngTooLargeException(8193, 8192);

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
