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
import { AddonLoadException } from "@noldova/computer-use.runtime/windows";
import { Exception, ExceptionOptions } from "@noldova/context.exceptions";

class SampleAddonLoadException extends AddonLoadException {
  public constructor(message: string, options?: ExceptionOptions) {
    super(message, options);
  }
}

describe("AddonLoadException", () => {
  it("carries the message and the cause its subclass gives", () => {
    const cause = new Error("The program failed.");
    const exception = new SampleAddonLoadException("Refused.", new ExceptionOptions(cause));

    assert.equal(exception.message, "Refused.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "SampleAddonLoadException");
  });

  it("is a computer use exception and a context exception", () => {
    const exception = new SampleAddonLoadException("Refused.");

    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
