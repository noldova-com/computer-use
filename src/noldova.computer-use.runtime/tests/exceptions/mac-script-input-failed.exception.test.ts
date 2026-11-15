/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException } from "@noldova/computer-use.runtime";
import { MacDesktopException, MacScriptEndedException, MacScriptInputFailedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptInputFailedException", () => {
  it("carries its message, its cause and its name", () => {
    const cause = new Error("The pipe has closed.");
    const exception = new MacScriptInputFailedException(cause);

    assert.equal(exception.message, "A request couldn't be written to the macOS input process: Error: The pipe has closed.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "MacScriptInputFailedException");
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptInputFailedException(new Error("The pipe has closed."));

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
