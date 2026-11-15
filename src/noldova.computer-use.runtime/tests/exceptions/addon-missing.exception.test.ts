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
import { AddonLoadException, AddonMissingException } from "@noldova/computer-use.runtime/windows";
import { Exception } from "@noldova/context.exceptions";

describe("AddonMissingException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new AddonMissingException("windows-desktop.node", "win32-arm64");

    assert.equal(exception.message, "There is no win32-arm64 build of the addon: windows-desktop.node is missing.");
    assert.equal(exception.file, "windows-desktop.node");
    assert.equal(exception.target, "win32-arm64");
    assert.equal(exception.name, "AddonMissingException");
  });

  it("is its category, AddonLoadException, a computer use exception and a context exception", () => {
    const exception = new AddonMissingException("windows-desktop.node", "win32-arm64");

    assert.ok(exception instanceof AddonLoadException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
