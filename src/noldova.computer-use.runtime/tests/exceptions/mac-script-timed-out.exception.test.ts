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
import { MacDesktopException, MacScriptEndedException, MacScriptTimedOutException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptTimedOutException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new MacScriptTimedOutException("listWindows", 10000);

    assert.equal(exception.message, "The macOS input process didn't answer listWindows within 10000 ms, so it was ended.");
    assert.equal(exception.method, "listWindows");
    assert.equal(exception.timeoutMs, 10000);
    assert.equal(exception.name, "MacScriptTimedOutException");
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptTimedOutException("listWindows", 10000);

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
