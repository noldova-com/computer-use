/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException, DisplayException, DisplayScaleInvalidException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("DisplayScaleInvalidException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new DisplayScaleInvalidException("d");

    assert.equal(exception.message, "Display d's scale factor must be a finite number above zero.");
    assert.equal(exception.displayId, "d");
    assert.equal(exception.name, "DisplayScaleInvalidException");
  });

  it("is its category, DisplayException, a computer use exception and a context exception", () => {
    const exception = new DisplayScaleInvalidException("d");

    assert.ok(exception instanceof DisplayException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
