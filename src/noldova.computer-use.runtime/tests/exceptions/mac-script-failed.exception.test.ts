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
import { MacDesktopException, MacScriptFailedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptFailedException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new MacScriptFailedException("listDisplays", "The display list is unavailable.");

    assert.equal(exception.message, "The macOS input process failed listDisplays: The display list is unavailable.");
    assert.equal(exception.method, "listDisplays");
    assert.equal(exception.scriptMessage, "The display list is unavailable.");
    assert.equal(exception.name, "MacScriptFailedException");
  });

  it("is its category, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptFailedException("listDisplays", "The display list is unavailable.");

    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
