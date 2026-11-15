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
import { MacCaptureEndedException, MacDesktopException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";
import { ProcessExit } from "@noldova/desktop.runtime";

describe("MacCaptureEndedException", () => {
  it("carries the exit it ended with, its code in its message", () => {
    const exit = new ProcessExit(1, null);
    const exception = new MacCaptureEndedException(exit);

    assert.equal(exception.message, "macOS's screencapture ended (1) without capturing the window.");
    assert.equal(exception.exit, exit);
    assert.equal(exception.name, "MacCaptureEndedException");
  });

  it("carries the exit a signal ended, the signal in its message", () => {
    const exit = new ProcessExit(null, "SIGTERM");
    const exception = new MacCaptureEndedException(exit);

    assert.equal(exception.message, "macOS's screencapture ended (SIGTERM) without capturing the window.");
    assert.equal(exception.exit, exit);
  });

  it("is its category, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacCaptureEndedException(new ProcessExit(1, null));

    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
