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
import { MacCaptureFailedException, MacDesktopException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacCaptureFailedException", () => {
  it("carries its message, its facts and its name", () => {
    const cause = new Error("The program failed.");
    const exception = new MacCaptureFailedException(cause);

    assert.equal(exception.message, "macOS's screencapture couldn't capture the window.");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "MacCaptureFailedException");
  });

  it("is its category, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacCaptureFailedException(new Error("The program failed."));

    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
