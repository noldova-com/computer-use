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
import { MacDesktopException, MacScriptEndedException } from "@noldova/computer-use.runtime/macos";
import { Exception, ExceptionOptions } from "@noldova/context.exceptions";

class SampleMacScriptEndedException extends MacScriptEndedException {
  public constructor(message: string, options?: ExceptionOptions) {
    super(message, options);
  }
}

describe("MacScriptEndedException", () => {
  it("carries the message and the cause its subclass gives", () => {
    const cause = new Error("The pipe has closed.");
    const exception = new SampleMacScriptEndedException("Ended.", new ExceptionOptions(cause));

    assert.equal(exception.message, "Ended.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "SampleMacScriptEndedException");
  });

  it("is MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new SampleMacScriptEndedException("Ended.");

    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
