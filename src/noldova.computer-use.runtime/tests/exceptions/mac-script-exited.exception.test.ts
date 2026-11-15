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
import { MacDesktopException, MacScriptEndedException, MacScriptExitedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";
import { ProcessExit } from "@noldova/desktop.runtime";

describe("MacScriptExitedException", () => {
  it("carries the exit it ended with, its code in its message", () => {
    const exit = new ProcessExit(3, null);
    const exception = new MacScriptExitedException(exit, "");

    assert.equal(exception.message, "The macOS input process ended (3).");
    assert.equal(exception.exit, exit);
    assert.equal(exception.lastError, "");
    assert.equal(exception.name, "MacScriptExitedException");
  });

  it("carries the exit a signal ended and the last line of its errors, both in its message", () => {
    const exit = new ProcessExit(null, "SIGTERM");
    const exception = new MacScriptExitedException(exit, "last line");

    assert.equal(exception.message, "The macOS input process ended (SIGTERM): last line");
    assert.equal(exception.exit, exit);
    assert.equal(exception.lastError, "last line");
  });

  it("keeps the whole last line of its errors, but only its first 4,096 characters in its message", () => {
    const lastError = `${"x".repeat(4096)}y`;
    const exception = new MacScriptExitedException(new ProcessExit(4, null), lastError);

    assert.equal(exception.message, `The macOS input process ended (4): ${"x".repeat(4096)}`);
    assert.equal(exception.lastError, lastError);
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptExitedException(new ProcessExit(3, null), "");

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
