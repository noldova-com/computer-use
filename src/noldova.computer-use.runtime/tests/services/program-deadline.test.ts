/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import timers from "node:timers/promises";
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

describe("ProgramDeadline", () => {
  it("ends the program at its time limit and not before", async () => {
    const starter = new ProgramStarts();
    const reader = new MacCodeSignProgram(starter, process.execPath, [program], TIMEOUT_MS);
    const started = starter.nextStartAsync();

    const reading = reader.readSignerAsync("/Applications/Hang.app", new AbortController().signal);
    const codesign = await started;
    const beforeLimit = timers.setTimeout(TIMEOUT_MS - 1);
    mock.timers.tick(TIMEOUT_MS - 1);
    await beforeLimit;
    const earlyEnd = [starter.requests[0]?.signal?.aborted, codesign.hasExited];
    mock.timers.tick(1);

    assert.equal(await reading, null);
    assert.deepEqual([earlyEnd, starter.requests[0]?.signal?.aborted, codesign.hasExited], [[false, false], true, true]);
  });
});
