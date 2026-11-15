/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendValueException, BundleIdInvalidException, ComputerUseException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("BundleIdInvalidException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new BundleIdInvalidException("com example");

    assert.equal(exception.message, "\"com example\" is not a bundle identifier: it is empty or holds a space or a slash.");
    assert.equal(exception.bundleId, "com example");
    assert.equal(exception.name, "BundleIdInvalidException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new BundleIdInvalidException("com example");

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
