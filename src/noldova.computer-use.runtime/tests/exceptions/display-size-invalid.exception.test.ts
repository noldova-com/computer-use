/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException, DisplayException, DisplaySizeInvalidException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("DisplaySizeInvalidException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new DisplaySizeInvalidException("d");

    assert.equal(exception.message, "Display d's size must be whole pixels above zero.");
    assert.equal(exception.displayId, "d");
    assert.equal(exception.name, "DisplaySizeInvalidException");
  });

  it("is its category, DisplayException, a computer use exception and a context exception", () => {
    const exception = new DisplaySizeInvalidException("d");

    assert.ok(exception instanceof DisplayException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
