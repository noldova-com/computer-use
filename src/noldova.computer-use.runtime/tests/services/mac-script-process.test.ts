/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import {
  MacScriptClosedException,
  type MacScriptEndedException,
  MacScriptExitedException,
  MacScriptFailedException,
  MacScriptInputFailedException,
  MacScriptLineUnreadableException,
  MacScriptOutputFailedException,
  MacScriptProcess,
  MacScriptStartFailedException,
  MacScriptTimedOutException
} from "@noldova/computer-use.runtime/macos";
import { type OwnedProcess, ProcessStartFailedException } from "@noldova/desktop.runtime";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";

const script = fileURLToPath(new URL("../fixtures/mac-script-double.cjs", import.meta.url));
const TIMEOUT_MS = 10_000;
const MAX_LINE_LENGTH = 4 * 1024 * 1024;
const ECHOED = { parameters: {}, isAscii: true };

before(() => {
  mock.timers.enable({ apis: ["setTimeout"] });
});

after(() => {
  mock.timers.reset();
});

async function withProcessAsync(test: (process: MacScriptProcess, starter: ProgramStarterDouble) => Promise<void>): Promise<void> {
  const starter = new ProgramStarterDouble();
  const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);
  try {
    await test(channel, starter);
  } finally {
    await channel.closeAsync();
  }
}

async function assertEndedAsync(call: Promise<unknown>, type: abstract new (...args: never[]) => MacScriptEndedException, message: string | RegExp): Promise<void> {
  await assert.rejects(call, type);
  await assert.rejects(call, { message });
}

describe("MacScriptProcess, answering over one process", { concurrency: true }, () => {
  const starter = new ProgramStarterDouble();
  const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);

  after(async () => {
    await channel.closeAsync();
  });

  it("answers each call with its result, sending every character as ASCII", async () => {
    const parameters = { text: "\u007fé 😀\n\t\"", count: 2 };

    assert.deepEqual(await channel.callAsync("echo", parameters), { parameters, isAscii: true });
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
  });

  it("answers calls that wait together, each with its own result", async () => {
    const results = await Promise.all([1, 2, 3].map(t => channel.callAsync("echo", { t })));

    assert.deepEqual(results, [1, 2, 3].map(t => ({ parameters: { t }, isAscii: true })));
  });

  it("answers no value for an answer without a result, as a method that returns nothing gives, and null for a null result", async () => {
    assert.deepEqual([await channel.callAsync("empty", {}), await channel.callAsync("none", {})], [undefined, null]);
  });

  it("fails the call with the error the process answers, and keeps the process", async () => {
    await assert.rejects(channel.callAsync("fail", {}), MacScriptFailedException);
    await assert.rejects(channel.callAsync("fail", {}), { method: "fail", scriptMessage: "The method failed." });
    assert.deepEqual(await channel.callAsync("echo", { t: 1 }), { parameters: { t: 1 }, isAscii: true });
    assert.equal(starter.requests.length, 1);
  });
});

describe("MacScriptProcess", { concurrency: true }, () => {
  for (const [method, line] of [["garbage", "not json"], ["null", "null"], ["number", "42"], ["stranger", "{\"id\":1002,\"result\":1}"], ["badError", "{\"id\":2,\"error\":5}"]] as const)
    it(`ends the process when it answers a line it can't match (${method}), and starts a new one at the next call`, () => withProcessAsync(async (channel, starter) => {
      const expected = `The macOS input process answered a line of ${line.length} characters that the module can't read.`;
      const calls = [channel.callAsync("hang", {}), channel.callAsync(method, {})];

      await Promise.all(calls.map(async t => await assertEndedAsync(t, MacScriptLineUnreadableException, expected)));
      await Promise.all(calls.map(async t => await assert.rejects(t, { length: line.length })));
      assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
      assert.equal(starter.requests.length, 2);
    }));

  it("reads an answer line of the longest length it reads", () => withProcessAsync(async channel => {
    const result = await channel.callAsync("long", { length: MAX_LINE_LENGTH });

    assert.equal(typeof result === "string" ? result.length : null, MAX_LINE_LENGTH - JSON.stringify({ id: 1, result: "" }).length);
  }));

  it("ends the process once an answer sent in chunks with no line break passes the longest line it reads, without waiting for the break", () => withProcessAsync(async (channel, starter) => {
    const calls = [channel.callAsync("hang", {}), channel.callAsync("endless", { length: MAX_LINE_LENGTH })];

    await Promise.all(calls.map(async t => await assert.rejects(t, MacScriptLineUnreadableException)));
    await Promise.all(calls.map(async t => await assert.rejects(t, (error: unknown) =>
      error instanceof MacScriptLineUnreadableException && error.length > MAX_LINE_LENGTH && error.length <= MAX_LINE_LENGTH + 64 * 1024)));
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    assert.equal(starter.requests.length, 2);
  }));

  it("ends the process at once when it answers a line longer than it reads, naming only the length", () => withProcessAsync(async (channel, starter) => {
    const calls = [channel.callAsync("hang", {}), channel.callAsync("long", { length: MAX_LINE_LENGTH + 1 })];

    await Promise.all(calls.map(async t => await assertEndedAsync(t, MacScriptLineUnreadableException,
      `The macOS input process answered a line of ${MAX_LINE_LENGTH + 1} characters that the module can't read.`)));
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    assert.equal(starter.requests.length, 2);
  }));

  it("fails the waiting calls with the exit code when the process ends", () => withProcessAsync(async channel => {
    const calls = [channel.callAsync("hang", {}), channel.callAsync("exit", {})];

    await Promise.all(calls.map(async t => await assertEndedAsync(t, MacScriptExitedException, "The macOS input process ended (3).")));
    await Promise.all(calls.map(async t => await assert.rejects(t, (error: unknown) => error instanceof MacScriptExitedException && error.exit.code === 3 && error.exit.signal === null && error.lastError === "")));
  }));

  it("names the last line the process wrote to its errors when it ends", () => withProcessAsync(async channel => {
    await assertEndedAsync(channel.callAsync("exitWithError", {}), MacScriptExitedException, "The macOS input process ended (4): last line");
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
  }));

  it("keeps only the first 4,096 characters of the last line the process wrote to its errors, one with no line break included", () => withProcessAsync(async channel => {
    const kept = "x".repeat(4096);
    const ended = channel.callAsync("exitWithLongError", { length: 100_000 });

    await assertEndedAsync(ended, MacScriptExitedException, `The macOS input process ended (4): ${kept}`);
    await assert.rejects(ended, (error: unknown) => error instanceof MacScriptExitedException && error.lastError === kept);
  }));

  it("answers a last line the process writes with no line break before it ends", () => withProcessAsync(async (channel, starter) => {
    assert.equal(await channel.callAsync("unterminated", {}), "last");
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    assert.equal(starter.requests.length, 2);
  }));

  for (const [name, streamOf] of [["errors", (t: OwnedProcess) => t.errors], ["answers", (t: OwnedProcess) => t.output]] as const)
    it(`fails the waiting calls with the stream's error when the process's ${name} can't be read, and starts a new process at the next call`, async () => {
      const starter = new ProgramStarterDouble();
      const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);
      await channel.callAsync("echo", {});
      const failure = new Error("The pipe broke.");
      const waiting = channel.callAsync("hang", {});
      const program = starter.programs[0];
      assert.ok(program !== undefined);

      streamOf(program).emit("error", failure);
      await assertEndedAsync(waiting, MacScriptOutputFailedException, "The macOS input process's answers or errors couldn't be read: Error: The pipe broke.");
      await assert.rejects(waiting, { cause: failure });
      assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
      await channel.closeAsync();
      await starter.endAsync();
    });

  it("fails the call when the program can't start", async () => {
    const channel = new MacScriptProcess(new ProgramStarterDouble(), path.join(tmpdir(), `missing-${randomUUID()}`), [], TIMEOUT_MS);

    await assertEndedAsync(channel.callAsync("echo", {}), MacScriptStartFailedException, /^The macOS input process couldn't be started: /u);
    await channel.closeAsync();
  });

  it("starts its program through the context, in the temporary folder, once for the calls it answers", async () => {
    const starter = new ProgramStarterDouble();
    const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);

    await channel.callAsync("echo", {});
    await channel.callAsync("echo", {});
    await channel.closeAsync();

    assert.deepEqual(starter.requests.map(t => [t.program, t.arguments, t.workingFolder]), [[process.execPath, [script], tmpdir()]]);
  });

  it("fails the call when the context refuses to start the program, or as closed when it closes while the program starts", async () => {
    const starter = new ProgramStarterDouble();
    const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);
    const refusal = new ProcessStartFailedException(process.execPath);
    starter.failure = refusal;
    const refused = channel.callAsync("echo", {});

    await assertEndedAsync(refused, MacScriptStartFailedException, `The macOS input process couldn't be started: ${String(refusal)}`);
    await assert.rejects(refused, { cause: refusal });
    starter.failure = new ProcessStartFailedException(process.execPath);
    const call = assertEndedAsync(channel.callAsync("echo", {}), MacScriptClosedException, "The macOS input process was closed.");
    await channel.closeAsync();
    await call;
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    await channel.closeAsync();
  });

  it("fails the waiting calls with the stream's error when a request can't be written, and starts a new process at the next call", async () => {
    const starter = new ProgramStarterDouble();
    const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);
    await channel.callAsync("echo", {});
    const failure = new Error("The pipe has closed.");
    const waiting = channel.callAsync("hang", {});

    starter.programs[0]?.input.emit("error", failure);
    await assertEndedAsync(waiting, MacScriptInputFailedException, "A request couldn't be written to the macOS input process: Error: The pipe has closed.");
    await assert.rejects(waiting, { cause: failure });
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    await channel.closeAsync();
    await starter.endAsync();
  });

  it("writes to the module's log a program that wouldn't stop, and still fails the waiting calls", async () => {
    const starter = new ProgramStarterDouble();
    const channel = new MacScriptProcess(starter, process.execPath, [script], TIMEOUT_MS);
    await channel.callAsync("echo", {});
    starter.stopFailure = new Error("The program wouldn't stop.");
    const written = starter.nextWriteAsync();
    const waiting = assertEndedAsync(channel.callAsync("hang", {}), MacScriptClosedException, "The macOS input process was closed.");

    await channel.closeAsync();
    await waiting;
    assert.equal(await written, "The macOS input process couldn't be stopped: Error: The program wouldn't stop.");
    assert.equal(starter.written.length, 1);
  });

  it("fails the waiting calls when it closes, and closes again without a process", async () => {
    const channel = new MacScriptProcess(new ProgramStarterDouble(), process.execPath, [script], TIMEOUT_MS);
    await channel.closeAsync();
    const waiting = assertEndedAsync(channel.callAsync("hang", {}), MacScriptClosedException, "The macOS input process was closed.");

    await channel.closeAsync();
    await waiting;
    await channel.closeAsync();
  });
});

describe("MacScriptProcess, on the test's clock", () => {
  it("ends the process when a call isn't answered in time, failing every waiting call, and starts a new one at the next call", () => withProcessAsync(async (channel, starter) => {
    const expected = "The macOS input process didn't answer hang within 10000 ms, so it was ended.";
    const hangs = Promise.all([channel.callAsync("hang", {}), channel.callAsync("hang", {})].map(async t => await assertEndedAsync(t, MacScriptTimedOutException, expected)));
    let settled = false;
    const settle = (): void => {
      settled = true;
    };
    void hangs.then(settle, settle);

    mock.timers.tick(TIMEOUT_MS - 1);
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    assert.deepEqual([settled, starter.requests.length], [false, 1], "The calls ended before their limit.");
    mock.timers.tick(1);
    await hangs;
    assert.deepEqual(await channel.callAsync("echo", {}), ECHOED);
    assert.equal(starter.requests.length, 2);
  }));

  it("fails a call whose program doesn't start within the call's limit", async () => {
    const channel = new MacScriptProcess({ log: { write: () => undefined }, startProcessAsync: () => new Promise<never>(() => undefined) }, process.execPath, [script], TIMEOUT_MS);
    const echo = channel.callAsync("echo", {});
    const call = assertEndedAsync(echo, MacScriptTimedOutException, "The macOS input process didn't answer echo within 10000 ms, so it was ended.");

    mock.timers.tick(TIMEOUT_MS);
    await call;
    await assert.rejects(echo, { method: "echo", timeoutMs: TIMEOUT_MS });
  });
});
