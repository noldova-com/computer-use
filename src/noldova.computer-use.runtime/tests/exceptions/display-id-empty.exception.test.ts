/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException, DisplayException, DisplayIdEmptyException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("DisplayIdEmptyException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new DisplayIdEmptyException();

    assert.equal(exception.message, "A display ID must not be empty.");
    assert.equal(exception.name, "DisplayIdEmptyException");
  });

  it("is its category, DisplayException, a computer use exception and a context exception", () => {
    const exception = new DisplayIdEmptyException();

    assert.ok(exception instanceof DisplayException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
