/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException, DisplayException, DisplayOriginInvalidException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("DisplayOriginInvalidException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new DisplayOriginInvalidException("d");

    assert.equal(exception.message, "Display d's position must be whole pixels.");
    assert.equal(exception.displayId, "d");
    assert.equal(exception.name, "DisplayOriginInvalidException");
  });

  it("is its category, DisplayException, a computer use exception and a context exception", () => {
    const exception = new DisplayOriginInvalidException("d");

    assert.ok(exception instanceof DisplayException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
