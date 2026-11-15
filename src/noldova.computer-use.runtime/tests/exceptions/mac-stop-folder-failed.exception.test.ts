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
import { MacDesktopException, MacStopFolderFailedException } from "@noldova/computer-use.runtime/macos";
import { Exception } from "@noldova/context.exceptions";

describe("MacStopFolderFailedException", () => {
  it("carries its message, its facts, its cause and its name", () => {
    const cause = new Error("EACCES");
    const exception = new MacStopFolderFailedException("/tmp/stops", cause);

    assert.equal(exception.message, "The folder for a drag's stop files, /tmp/stops, couldn't be prepared.");
    assert.equal(exception.folder, "/tmp/stops");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "MacStopFolderFailedException");
  });

  it("is its category, MacDesktopException, a computer use exception and a context exception", () => {
    const exception = new MacStopFolderFailedException("/tmp/stops", new Error("EACCES"));

    assert.ok(exception instanceof MacDesktopException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
