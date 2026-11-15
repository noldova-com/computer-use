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
import { MacDesktopException, MacScriptEndedException, MacScriptStartFailedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptStartFailedException", () => {
  it("carries its message, its cause and its name", () => {
    const cause = new Error("No such program.");
    const exception = new MacScriptStartFailedException(cause);

    assert.equal(exception.message, "The macOS input process couldn't be started: Error: No such program.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "MacScriptStartFailedException");
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptStartFailedException(new Error("No such program."));

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
