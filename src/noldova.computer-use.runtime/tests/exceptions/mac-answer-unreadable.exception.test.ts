/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendValueException, ComputerUseException } from "@noldova/computer-use.runtime";
import { MacAnswerUnreadableException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacAnswerUnreadableException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new MacAnswerUnreadableException("listDisplays");

    assert.equal(exception.message, "The macOS input process answered listDisplays with a value the module can't read.");
    assert.equal(exception.method, "listDisplays");
    assert.equal(exception.name, "MacAnswerUnreadableException");
  });

  it("is its category, BackendValueException, a computer use exception and a context exception", () => {
    const exception = new MacAnswerUnreadableException("listDisplays");

    assert.ok(exception instanceof BackendValueException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
