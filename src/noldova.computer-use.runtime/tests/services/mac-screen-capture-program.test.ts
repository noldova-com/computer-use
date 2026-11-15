/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import fsPromises, { mkdir, mkdtemp, readdir, stat, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it, mock, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

import { MacCaptureEndedException, MacCaptureFailedException, MacCaptureFileLeftException, MacCaptureFileTooLargeException, MacScreenCaptureProgram } from "@noldova/computer-use.runtime/macos";
import { type OwnedProcess, ProcessStartFailedException } from "@noldova/desktop.runtime";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";
import { ProgramStarts } from "./program-starts.fixture.ts";

const program = fileURLToPath(new URL("../fixtures/mac-capture-double.cjs", import.meta.url));
const ROOT = mkdtempSync(path.join(tmpdir(), "capture-test-"));
const TIMEOUT_MS = 10_000;
const OVERSIZED_BYTES = 2 * 8192 * 8192 * 4 + 1;
const openFile = fsPromises.open;

before(() => {
  mock.timers.enable({ apis: ["setTimeout"] });
});

after(() => {
  mock.timers.reset();
  rmSync(ROOT, { recursive: true, force: true });
});

async function newFolderAsync(): Promise<string> {
  return path.join(await mkdtemp(path.join(ROOT, "capture-")), "captures");
}

async function withFileCallAsync(t: TestContext, name: "open" | "readdir" | "rm", replacement: (file: string) => Promise<unknown>, test: () => Promise<void>): Promise<void> {
  try {
    t.mock.method(fsPromises, name, replacement);
    syncBuiltinESMExports();
    await test();
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
}

class HangingCapture {
  public readonly capture: Promise<Uint8Array>;
  public readonly screencapture: OwnedProcess;

  public constructor(capture: Promise<Uint8Array>, screencapture: OwnedProcess) {
    this.capture = capture;
    this.screencapture = screencapture;
  }
}

async function startHangingAsync(folder: string, signal: AbortSignal): Promise<HangingCapture> {
  const starter = new ProgramStarts();
  const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program, "--hang"], TIMEOUT_MS, folder);
  const started = starter.nextStartAsync();
  const capture = capturer.captureWindowAsync("1", signal);
  const screencapture = await started;
  await once(screencapture.output, "data");

  return new HangingCapture(capture, screencapture);
}

describe("MacScreenCaptureProgram", { concurrency: true }, () => {
  it("captures the window by its number, without its shadow, silently as PNG into a file of its own in its folder, which it reads and removes", async () => {
    const folder = await newFolderAsync();
    const starter = new ProgramStarterDouble();
    const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program], TIMEOUT_MS, folder);

    const lines = new TextDecoder().decode(await capturer.captureWindowAsync("1234", AbortSignal.timeout(TIMEOUT_MS))).split("\n");
    const file = lines.at(-1) ?? "";

    assert.deepEqual(starter.requests.map(t => [t.program, t.workingFolder, t.environment]), [[process.execPath, folder, {}]]);
    assert.deepEqual(lines.slice(0, -1), ["-l1234", "-o", "-x", "-t", "png"]);
    assert.equal(path.dirname(file), folder);
    assert.match(path.basename(file), new RegExp(`^${process.pid}-[\\da-f-]{36}\\.png$`, "u"));
    assert.equal(existsSync(file), false);
  });

  it("makes its folder readable only by the person, and narrows a folder that was open to others", { skip: process.platform === "win32" ? "Windows keeps no folder mode." : false }, async () => {
    const folder = await newFolderAsync();
    await mkdir(folder, { mode: 0o755 });
    const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, folder);

    await capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS));

    assert.equal((await stat(folder)).mode & 0o777, 0o700);
  });

  it("first removes the files a process no longer running left in its folder, and keeps those of a running one", async () => {
    const folder = await newFolderAsync();
    await mkdir(folder);
    const running = `${process.ppid}-in-flight.png`;
    for (const name of ["2147483646-left-by-a-crash.png", running, "unnamed.png"])
      await writeFile(path.join(folder, name), "unmasked");
    const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, folder);

    await capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS));

    assert.deepEqual(await readdir(folder), [running]);
  });

  it("removes a file named after no process the system could run", async () => {
    const folder = await newFolderAsync();
    await mkdir(folder);
    await writeFile(path.join(folder, "2147483648-above-every-process.png"), "unmasked");
    const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, folder);

    await capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS));

    assert.deepEqual(await readdir(folder), []);
  });

  it("gives each capture a file of its own", async () => {
    const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

    const files = await Promise.all([1, 2].map(async () => new TextDecoder().decode(await capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS))).split("\n").at(-1)));

    assert.notEqual(files[0], files[1]);
  });

  it("ends screencapture when the call is cancelled, failing as cancelled, and removes its file", async () => {
    const folder = await newFolderAsync();
    const controller = new AbortController();
    const { capture, screencapture } = await startHangingAsync(folder, controller.signal);

    controller.abort();

    await assert.rejects(capture, { name: "AbortError" });
    assert.equal(screencapture.hasExited, true);
    assert.deepEqual(await readdir(folder), []);
  });

  it("removes the file of a capture that fails after writing it", async () => {
    const folder = await newFolderAsync();
    const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program, "--fail-after-file"], TIMEOUT_MS, folder);

    await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), MacCaptureFailedException);
    assert.deepEqual(await readdir(folder), []);
  });

  for (const [option, reason, cause] of [["--fail", "the program fails", MacCaptureEndedException], ["--no-file", "the program writes no file", Error]] as const)
    it(`fails the capture when ${reason}`, async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program, option], TIMEOUT_MS, await newFolderAsync());

      await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => {
        assert.ok(error instanceof MacCaptureFailedException);
        assert.equal(error.message, "macOS's screencapture couldn't capture the window.");
        assert.ok(error.cause instanceof cause);
        return true;
      });
    });

  it("fails the capture, naming the exit, when screencapture ends with an error", async () => {
    const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program, "--fail"], TIMEOUT_MS, await newFolderAsync());

    await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => {
      assert.ok(error instanceof MacCaptureFailedException && error.cause instanceof MacCaptureEndedException);
      assert.match(error.cause.message, /^macOS's screencapture ended \(\d+\) without capturing the window\.$/u);
      assert.equal(error.cause.exit.code, 1);
      assert.equal(error.cause.exit.signal, null);
      return true;
    });
  });

  it("fails the capture when the context can't start screencapture", async () => {
    const starter = new ProgramStarterDouble();
    const refusal = new ProcessStartFailedException(process.execPath);
    starter.failure = refusal;
    const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

    await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error instanceof MacCaptureFailedException && error.cause === refusal);
  });

  it("passes on a defect of the start, rather than failing the capture", async () => {
    const starter = new ProgramStarterDouble();
    const defect = new TypeError("A defect in the module.");
    starter.failure = defect;
    const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

    await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error === defect);
  });
});

describe("MacScreenCaptureProgram, with the clock or the file system replaced", () => {
  it("ends screencapture at its time limit and fails the capture", async () => {
    const folder = await newFolderAsync();
    const { capture } = await startHangingAsync(folder, new AbortController().signal);

    mock.timers.tick(TIMEOUT_MS);

    await assert.rejects(capture, (error: unknown) => error instanceof MacCaptureFailedException && error.cause instanceof MacCaptureEndedException);
    assert.deepEqual(await readdir(folder), []);
  });

  it("passes on a defect of the check for a file's process, keeping the files and starting nothing", async t => {
    const folder = await newFolderAsync();
    await mkdir(folder);
    const name = `${process.ppid}-in-flight.png`;
    await writeFile(path.join(folder, name), "unmasked");
    const defect = new Error("The check broke.");
    t.mock.method(process, "kill", () => {
      throw defect;
    });
    const starter = new ProgramStarterDouble();
    const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program], TIMEOUT_MS, folder);

    await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error === defect);
    assert.deepEqual([await readdir(folder), starter.requests], [[name], []]);
  });

  it("passes on a defect while it prepares its folder, rather than failing the capture", async t => {
    const defect = new TypeError("A defect in the module.");
    await withFileCallAsync(t, "readdir", () => Promise.reject(defect), async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

      await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error === defect);
    });
  });

  it("fails the capture, starting nothing, when its time limit passes before screencapture starts", async t => {
    const starter = new ProgramStarterDouble();
    await withFileCallAsync(t, "readdir", () => {
      mock.timers.tick(TIMEOUT_MS);
      return Promise.resolve([]);
    }, async () => {
      const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

      await assert.rejects(capturer.captureWindowAsync("1", new AbortController().signal), (error: unknown) => error instanceof MacCaptureFailedException && error.cause instanceof DOMException && error.cause.name === "AbortError");
    });
    assert.deepEqual(starter.programs, []);
  });

  it("refuses a capture file larger than any capture it decodes, without reading it, and removes it", async t => {
    const folder = await newFolderAsync();
    await withFileCallAsync(t, "open", async (file: string) => {
      const handle = await openFile(file);
      t.mock.method(handle, "stat", () => Promise.resolve({ size: OVERSIZED_BYTES }));
      t.mock.method(handle, "read", () => Promise.reject(new Error("The capture file was read.")));
      return handle;
    }, async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, folder);

      const capture = capturer.captureWindowAsync("1", new AbortController().signal);
      await assert.rejects(capture, MacCaptureFileTooLargeException);
      await assert.rejects(capture, { size: OVERSIZED_BYTES });
    });
    assert.deepEqual(await readdir(folder), []);
  });

  it("passes on a defect reading its file, rather than failing the capture, and removes the file", async t => {
    const folder = await newFolderAsync();
    const defect = new TypeError("A defect in the module.");
    await withFileCallAsync(t, "open", () => Promise.reject(defect), async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, folder);

      await assert.rejects(capturer.captureWindowAsync("1", new AbortController().signal), (error: unknown) => error === defect);
    });
    assert.deepEqual(await readdir(folder), []);
  });

  it("passes on a defect reading its file after its time limit has passed, rather than failing the capture", async t => {
    const defect = new TypeError("A defect in the module.");
    await withFileCallAsync(t, "open", () => {
      mock.timers.tick(TIMEOUT_MS);
      return Promise.reject(defect);
    }, async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

      await assert.rejects(capturer.captureWindowAsync("1", new AbortController().signal), (error: unknown) => error === defect);
    });
  });

  it("fails the capture, naming the file, when the system can't remove its file", async t => {
    const failure = Object.assign(new Error("The file is busy."), { syscall: "rm", code: "EBUSY" });
    await withFileCallAsync(t, "rm", () => Promise.reject(failure), async () => {
      const folder = await newFolderAsync();
      const capturing = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, folder).captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS));

      await assert.rejects(capturing, (error: unknown) => error instanceof MacCaptureFileLeftException && path.dirname(error.file) === folder && error.cause === failure);
    });
  });

  it("keeps a failed capture's own failure when the system can't remove its file, and logs the file left", async t => {
    const failure = Object.assign(new Error("The file is busy."), { syscall: "rm", code: "EBUSY" });
    await withFileCallAsync(t, "rm", () => Promise.reject(failure), async () => {
      const folder = await newFolderAsync();
      const starter = new ProgramStarterDouble();
      const capturer = new MacScreenCaptureProgram(starter, process.execPath, [program, "--fail-after-file"], TIMEOUT_MS, folder);

      await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error instanceof MacCaptureFailedException && error.cause instanceof MacCaptureEndedException);
      const [file] = await readdir(folder);
      assert.deepEqual(starter.written, [`The capture file ${path.join(folder, file ?? "")} couldn't be removed.`]);
    });
  });

  it("passes on a failure removing its file that isn't the system's", async t => {
    const defect = new TypeError("A defect in the module.");
    await withFileCallAsync(t, "rm", () => Promise.reject(defect), async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program], TIMEOUT_MS, await newFolderAsync());

      await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error === defect);
    });
  });

  it("passes on a defect removing a failed capture's file", async t => {
    const defect = new TypeError("A defect in the module.");
    await withFileCallAsync(t, "rm", () => Promise.reject(defect), async () => {
      const capturer = new MacScreenCaptureProgram(new ProgramStarterDouble(), process.execPath, [program, "--fail"], TIMEOUT_MS, await newFolderAsync());

      await assert.rejects(capturer.captureWindowAsync("1", AbortSignal.timeout(TIMEOUT_MS)), (error: unknown) => error === defect);
    });
  });
});
