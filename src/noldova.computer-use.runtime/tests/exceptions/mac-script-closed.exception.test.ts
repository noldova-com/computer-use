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
import { MacDesktopException, MacScriptClosedException, MacScriptEndedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacScriptClosedException", () => {
  it("carries its message and its name", () => {
    const exception = new MacScriptClosedException();

    assert.equal(exception.message, "The macOS input process was closed.");
    assert.equal(exception.name, "MacScriptClosedException");
  });

  it("is its category, MacScriptEndedException, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacScriptClosedException();

    assert.ok(exception instanceof MacScriptEndedException);
    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
