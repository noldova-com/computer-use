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
import { MacDesktopException, MacScriptEndedException, MacScriptLineUnreadableException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptLineUnreadableException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new MacScriptLineUnreadableException(8);

    assert.equal(exception.message, "The macOS input process answered a line of 8 characters that the module can't read.");
    assert.equal(exception.length, 8);
    assert.equal(exception.name, "MacScriptLineUnreadableException");
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptLineUnreadableException(8);

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
