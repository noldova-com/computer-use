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
import { MacDesktopException, MacScriptEndedException, MacScriptOutputFailedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptOutputFailedException", () => {
  it("carries its message, its cause and its name", () => {
    const cause = new Error("The pipe broke.");
    const exception = new MacScriptOutputFailedException(cause);

    assert.equal(exception.message, "The macOS input process's answers or errors couldn't be read: Error: The pipe broke.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "MacScriptOutputFailedException");
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptOutputFailedException(new Error("The pipe broke."));

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
