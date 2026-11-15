/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { MacCodeSignProgram } from "@noldova/computer-use.runtime/macos";

import { ProgramStarts } from "./program-starts.fixture.ts";

const program = fileURLToPath(new URL("../fixtures/mac-codesign-double.cjs", import.meta.url));
const TIMEOUT_MS = 10_000;

before(() => {
  mock.timers.enable({ apis: ["setTimeout"] });
});

after(() => {
  mock.timers.reset();
});

describe("BoundedText", () => {
  it("keeps a program's text up to its limit and none past it, reading on to the end so the program's exit is read", async () => {
    const reader = new MacCodeSignProgram(new ProgramStarts(), process.execPath, [program], TIMEOUT_MS);

    assert.deepEqual(await Promise.all([
      reader.readSignerAsync("/Applications/AtLimit.app", new AbortController().signal),
      reader.readSignerAsync("/Applications/OverLimit.app", new AbortController().signal)
    ]), ["Example Corp", null]);
  });
});
