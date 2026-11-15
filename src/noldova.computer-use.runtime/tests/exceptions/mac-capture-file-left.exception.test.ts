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
import { MacCaptureFileLeftException, MacDesktopException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacCaptureFileLeftException", () => {
  it("carries its message, its facts, its cause and its name", () => {
    const cause = new Error("EBUSY");
    const exception = new MacCaptureFileLeftException("/tmp/captures/1-a.png", cause);

    assert.equal(exception.message, "The capture file /tmp/captures/1-a.png couldn't be removed.");
    assert.equal(exception.file, "/tmp/captures/1-a.png");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "MacCaptureFileLeftException");
  });

  it("is its category, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacCaptureFileLeftException("/tmp/captures/1-a.png", new Error("EBUSY"));

    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
