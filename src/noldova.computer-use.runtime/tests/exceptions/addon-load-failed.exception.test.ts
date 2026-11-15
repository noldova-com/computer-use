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
import { AddonLoadException, AddonLoadFailedException } from "@noldova/computer-use.runtime/windows";
import { Exception } from "@noldova/context.exceptions";

describe("AddonLoadFailedException", () => {
  it("carries its message, its facts and its name", () => {
    const cause = new Error("The program failed.");
    const exception = new AddonLoadFailedException("windows-desktop.node", cause);

    assert.equal(exception.message, "The addon windows-desktop.node couldn't be loaded.");
    assert.equal(exception.file, "windows-desktop.node");
    assert.equal(exception.cause, cause);
    assert.equal(exception.name, "AddonLoadFailedException");
  });

  it("is its category, AddonLoadException, a computer use exception and a context exception", () => {
    const exception = new AddonLoadFailedException("windows-desktop.node", new Error("The program failed."));

    assert.ok(exception instanceof AddonLoadException);
    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
