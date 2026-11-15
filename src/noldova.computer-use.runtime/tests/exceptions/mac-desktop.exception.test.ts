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
import { MacDesktopException } from "@noldova/computer-use.runtime/macos";
import { Exception, ExceptionOptions } from "@noldova/context.exceptions";

class SampleMacDesktopException extends MacDesktopException {
  public constructor(message: string, options?: ExceptionOptions) {
    super(message, options);
  }
}

describe("MacDesktopException", () => {
  it("carries the message and the cause its subclass gives", () => {
    const cause = new Error("The program failed.");
    const exception = new SampleMacDesktopException("Refused.", new ExceptionOptions(cause));

    assert.equal(exception.message, "Refused.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "SampleMacDesktopException");
  });

  it("is a computer use exception and a context exception", () => {
    const exception = new SampleMacDesktopException("Refused.");

    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
