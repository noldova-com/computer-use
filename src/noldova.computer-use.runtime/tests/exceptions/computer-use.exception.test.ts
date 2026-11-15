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
import { Exception, ExceptionOptions } from "@noldova/context.exceptions";

class SampleComputerUseException extends ComputerUseException {
  public constructor(message: string, options?: ExceptionOptions) {
    super(message, options);
  }
}

describe("ComputerUseException", () => {
  it("carries the message and the cause its subclass gives", () => {
    const cause = new Error("The program failed.");
    const exception = new SampleComputerUseException("Refused.", new ExceptionOptions(cause));

    assert.equal(exception.message, "Refused.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "SampleComputerUseException");
  });

  it("is a context exception", () => {
    const exception = new SampleComputerUseException("Refused.");

    assert.ok(exception instanceof Exception);
  });
});
