/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { WindowsBackend } from "@noldova/computer-use.runtime/windows";

describe("the Windows backend", () => {
  it("builds over the compiled addon without loading it", () => {
    assert.equal(WindowsBackend.load() instanceof WindowsBackend, true);
  });

  it("picks the build for this process's platform and architecture", () => {
    const entry = import.meta.resolve("@noldova/computer-use.runtime/windows");

    assert.equal(WindowsBackend.addonFile, fileURLToPath(new URL(`../../../native/${process.platform}-${process.arch}/windows-desktop.node`, entry)));
  });
});
