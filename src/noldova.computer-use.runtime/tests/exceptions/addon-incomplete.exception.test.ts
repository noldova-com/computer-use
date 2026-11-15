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
import { AddonIncompleteException, AddonLoadException } from "@noldova/computer-use.runtime/windows";
import { Exception } from "@noldova/context.exceptions";

describe("AddonIncompleteException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new AddonIncompleteException("windows-desktop.node");

    assert.equal(exception.message, "The addon windows-desktop.node lacks a function the module calls.");
    assert.equal(exception.file, "windows-desktop.node");
    assert.equal(exception.name, "AddonIncompleteException");
  });

  it("is its category, AddonLoadException, a computer use exception and a context exception", () => {
    const exception = new AddonIncompleteException("windows-desktop.node");

    assert.ok(exception instanceof AddonLoadException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
