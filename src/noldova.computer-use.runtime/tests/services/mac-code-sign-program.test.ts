/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { after, before, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { MacCodeSignProgram } from "@noldova/computer-use.runtime/macos";
import { ProcessStartFailedException } from "@noldova/desktop.runtime";

import { ProgramStarts } from "./program-starts.fixture.ts";

const program = fileURLToPath(new URL("../fixtures/mac-codesign-double.cjs", import.meta.url));
const TIMEOUT_MS = 10_000;

before(() => {
  mock.timers.enable({ apis: ["setTimeout"] });
});

after(() => {
  mock.timers.reset();
});

class CodeSignRun {
  public readonly reader: MacCodeSignProgram;
  public readonly starter: ProgramStarts = new ProgramStarts();

  public constructor() {
    this.reader = new MacCodeSignProgram(this.starter, process.execPath, [program], TIMEOUT_MS);
  }
}

describe("MacCodeSignProgram", { concurrency: true }, () => {
  it("reads a Developer ID app's publisher from its first authority, without the team, through the context", async () => {
    const { starter, reader } = new CodeSignRun();

    assert.equal(await reader.readSignerAsync("/Applications/Developer.app", AbortSignal.timeout(TIMEOUT_MS)), "Example Corp");
    assert.deepEqual(starter.requests.map(t => [t.program, [...t.arguments], t.workingFolder, t.environment]),
      [[process.execPath, [program, "-d", "--verbose=2", "/Applications/Developer.app"], tmpdir(), {}]]);
    assert.deepEqual(starter.written, []);
  });

  it("names Apple for Apple's own app, signed by Software Signing", async () => {
    const { reader } = new CodeSignRun();

    assert.equal(await reader.readSignerAsync("/System/Applications/Apple.app", AbortSignal.timeout(TIMEOUT_MS)), "Apple");
  });

  it("names no publisher for an App Store app or a TestFlight build, whose certificate is Apple's, not the publisher's", async () => {
    const { reader } = new CodeSignRun();

    assert.deepEqual(await Promise.all([
      reader.readSignerAsync("/Applications/AppStore.app", AbortSignal.timeout(TIMEOUT_MS)),
      reader.readSignerAsync("/Applications/TestFlight.app", AbortSignal.timeout(TIMEOUT_MS))
    ]), [null, null]);
  });

  it("names no publisher for an ad hoc signed app or an unsigned one", async () => {
    const { reader } = new CodeSignRun();

    assert.deepEqual(await Promise.all([
      reader.readSignerAsync("/Applications/Adhoc.app", AbortSignal.timeout(TIMEOUT_MS)),
      reader.readSignerAsync("/Applications/Unsigned.app", AbortSignal.timeout(TIMEOUT_MS))
    ]), [null, null]);
  });

  it("rejects with the caller's reason when the caller ends the read, and stops codesign", async () => {
    const { starter, reader } = new CodeSignRun();
    const controller = new AbortController();
    const reason = new Error("the caller left");
    const started = starter.nextStartAsync();

    const reading = reader.readSignerAsync("/Applications/Hang.app", controller.signal);
    const codesign = await started;
    controller.abort(reason);

    await assert.rejects(reading, reason);
    assert.equal(codesign.hasExited, true);
  });

  it("fails when codesign can't start", async () => {
    const { starter, reader } = new CodeSignRun();
    const failure = new ProcessStartFailedException(process.execPath);
    starter.failure = failure;

    await assert.rejects(reader.readSignerAsync("/Applications/Developer.app", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error === failure);
  });
});

describe("MacCodeSignProgram, on the test's clock", () => {
  it("stops codesign at its time limit, names no publisher, and logs the bundle it couldn't read", async () => {
    const { starter, reader } = new CodeSignRun();
    const started = starter.nextStartAsync();

    const reading = reader.readSignerAsync("/Applications/Hang.app", new AbortController().signal);
    const codesign = await started;
    mock.timers.tick(TIMEOUT_MS);

    assert.equal(await reading, null);
    assert.equal(codesign.hasExited, true);
    assert.deepEqual(starter.written, ["codesign didn't read the signature of Hang.app in time, so the app shows no publisher."]);
  });
});
