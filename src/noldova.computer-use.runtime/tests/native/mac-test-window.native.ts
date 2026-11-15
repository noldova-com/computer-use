/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { type IPoint, MacTestWindow } from "./mac-test-window.fixture.ts";

const TIMEOUT_MS = 10_000;
const POLL_MS = 100;
const AWAY: IPoint = { x: 200, y: 200 };
const WATCH = path.join(import.meta.dirname, "fixtures", "mac-window-watch.js");
const run = promisify(execFile);

class FrontDescription {
  public readonly bundle: string;
  public readonly processId: number;
  public readonly windowProcesses: readonly number[];

  private constructor(bundle: string, processId: number, windowProcesses: readonly number[]) {
    this.bundle = bundle;
    this.processId = processId;
    this.windowProcesses = windowProcesses;
  }

  public static read(text: string): FrontDescription {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || !("front" in value) || !("windows" in value) || !Array.isArray(value.windows))
      throw new Error(`The description "${text}" has no front and windows.`);
    const front = value.front;
    if (typeof front !== "object" || front === null || !("bundle" in front) || typeof front.bundle !== "string" || !("pid" in front) || typeof front.pid !== "number")
      throw new Error(`The description "${text}" names no app in front.`);
    const windows: unknown[] = value.windows;

    return new FrontDescription(front.bundle, front.pid, windows.flatMap(t => FrontDescription.readShownProcess(t)));
  }

  private static readShownProcess(window: unknown): readonly number[] {
    if (typeof window !== "object" || window === null || !("pid" in window) || typeof window.pid !== "number" || !("bounds" in window))
      return [];
    const bounds = window.bounds;
    if (typeof bounds !== "object" || bounds === null || !("Width" in bounds) || !("Height" in bounds) || typeof bounds.Width !== "number" || typeof bounds.Height !== "number")
      return [];

    return bounds.Width > 0 && bounds.Height > 0 ? [window.pid] : [];
  }
}

function listFolders(): readonly string[] {
  return fs.readdirSync(tmpdir()).filter(t => t.startsWith("noldova-test-window-"));
}

async function waitFrontAsync(processId: number): Promise<boolean> {
  for (const end = performance.now() + TIMEOUT_MS; performance.now() < end; await delay(POLL_MS))
    if (await MacTestWindow.readFrontProcessAsync(TIMEOUT_MS) === processId)
      return true;

  return false;
}

describe("the macOS test window", { skip: process.platform !== "darwin" ? "The macOS test window runs on macOS only." : false }, () => {
  async function withWindowAsync(test: (window: MacTestWindow) => Promise<void>): Promise<void> {
    const window = await MacTestWindow.openAsync();
    try {
      await window.takeLineAsync("ready ", TIMEOUT_MS);
      await test(window);
    } finally {
      await window.closeAsync(TIMEOUT_MS);
    }
  }

  it("fails the next wait with the stall, its run loop mode and the alert's text, when an error escapes the window's loop", async () => {
    await withWindowAsync(async window => {
      window.send("throw Thrown by the native test");

      const error = await window.takeLineAsync("never ", TIMEOUT_MS).then(() => null, (reason: unknown) => reason);

      assert.ok(error instanceof Error, "The wait didn't fail.");
      assert.match(error.message, /stopped answering before a "never " line: stalled NSModalPanelRunLoopMode .*Thrown by the native test/);
    });
  });

  it("puts the pointer at the window's start once it is ready, and back where it was once it closes", async () => {
    const before = await MacTestWindow.warpAsync(AWAY, TIMEOUT_MS);
    let start: IPoint | undefined;
    let inside: IPoint | undefined;
    let after: IPoint;
    try {
      const window = await MacTestWindow.openAsync();
      try {
        await window.takeLineAsync("ready ", TIMEOUT_MS);
        start = window.start;
        inside = await MacTestWindow.warpAsync(start, TIMEOUT_MS);
      } finally {
        await window.closeAsync(TIMEOUT_MS);
      }
    } finally {
      after = await MacTestWindow.warpAsync(before, TIMEOUT_MS);
    }

    assert.notDeepEqual(start, AWAY, "The window's start is where the test put the pointer, so its restore can't show.");
    assert.deepEqual(inside, start);
    assert.deepEqual(after, AWAY);
  });

  it("describes what is in front by its app and its windows' owners and bounds, naming no window's title", async () => {
    await withWindowAsync(async window => {
      const text = await MacTestWindow.describeFrontAsync(TIMEOUT_MS);

      const described = FrontDescription.read(text);
      assert.deepEqual([described.bundle.toLowerCase(), described.processId], [window.bundleId, window.pid], `In front: ${text}.`);
      assert.ok(described.windowProcesses.includes(window.pid), `No window of the test's process in ${text}.`);
      assert.ok(!text.includes(window.title), `The description names the test window's title: ${text}.`);
      assert.equal(await MacTestWindow.readFrontProcessAsync(TIMEOUT_MS), window.pid);
    });
  });

  it("answers a description that is cancelled as text, so it can't replace the failure it describes", async () => {
    assert.match(await MacTestWindow.describeFrontAsync(TIMEOUT_MS, AbortSignal.abort()), /^not described: /);
  });

  it("comes back to the front from another app's window that took it", async () => {
    await withWindowAsync(async window => {
      const other = await MacTestWindow.openAsync();
      try {
        await other.takeLineAsync("ready ", TIMEOUT_MS);
        if (!(await waitFrontAsync(other.pid)))
          assert.fail(`The second window didn't take the front: ${await MacTestWindow.describeFrontAsync(TIMEOUT_MS)}.`);

        await window.bringToFrontAsync(TIMEOUT_MS);

        if (!(await waitFrontAsync(window.pid)))
          assert.fail(`The test window didn't come back to the front: ${await MacTestWindow.describeFrontAsync(TIMEOUT_MS)}.`);
      } finally {
        await other.closeAsync(TIMEOUT_MS);
      }
    });
  });

  it("leaves no folder of its own when its open is cancelled", async () => {
    const before = listFolders();

    await assert.rejects(MacTestWindow.openAsync(MacTestWindow.BUNDLE_ID, AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(listFolders().filter(t => !before.includes(t)), []);
  });

  it("closes the window by itself once its folder is gone", async () => {
    const window = await MacTestWindow.openAsync();
    try {
      await window.takeLineAsync("ready ", TIMEOUT_MS);
      fs.rmSync(window.folder, { recursive: true, force: true });

      assert.equal(await window.exitAsync(TIMEOUT_MS), true);
    } finally {
      await window.closeAsync(TIMEOUT_MS);
    }
  });

  it("ends an applet that runs, its loop held, when a failed open abandons its folder", async () => {
    const window = await MacTestWindow.openAsync();
    try {
      await window.takeLineAsync("ready ", TIMEOUT_MS);
      window.send("block");
      await window.takeLineAsync("blocking", TIMEOUT_MS);

      await MacTestWindow.abandonAsync(window.folder);

      assert.equal(await window.exitAsync(TIMEOUT_MS), true, "The applet still runs after the open abandoned its folder.");
      assert.equal(fs.existsSync(window.folder), false, `The folder ${window.folder} is still there.`);
    } finally {
      await window.closeAsync(TIMEOUT_MS);
    }
  });

  it("throws both errors when the close and the pointer's restore both fail", async () => {
    const window = await MacTestWindow.openAsync();
    try {
      await window.takeLineAsync("ready ", TIMEOUT_MS);
      fs.chmodSync(window.folder, 0o500);

      const error = await window.closeAsync(TIMEOUT_MS, AbortSignal.abort()).then(() => null, (reason: unknown) => reason);

      assert.ok(error instanceof AggregateError, `The close threw ${String(error)}, not both errors.`);
      assert.equal(error.errors.length, 2);
    } finally {
      fs.chmodSync(window.folder, 0o700);
      await window.closeAsync(TIMEOUT_MS);
    }
  });

  it("opens no window and ends when its folder is gone before it runs", async () => {
    const copy = fs.mkdtempSync(path.join(tmpdir(), "noldova-test-applet-"));
    const app = path.join(copy, "NoldovaTestWindow.app");
    const ready = path.join(copy, "ready");
    const stop = path.join(copy, "stop");
    let watching: Promise<{ stdout: string }> | null = null;
    try {
      const window = await MacTestWindow.openAsync();
      try {
        await window.takeLineAsync("ready ", TIMEOUT_MS);
        fs.cpSync(path.join(window.folder, "NoldovaTestWindow.app"), app, { recursive: true });
      } finally {
        await window.closeAsync(TIMEOUT_MS);
      }
      watching = run("/usr/bin/osascript", ["-l", "JavaScript", WATCH, "NoldovaTestWindow", stop, ready], { timeout: 3 * TIMEOUT_MS });
      const end = performance.now() + TIMEOUT_MS;
      while (!fs.existsSync(ready) && performance.now() < end)
        await delay(POLL_MS);
      assert.ok(fs.existsSync(ready), `No look of the watch got a window list within ${TIMEOUT_MS} ms.`);
      const ended = await run("/usr/bin/open", ["-W", "-n", app, "--args", "-ApplePersistenceIgnoreState", "YES"], { timeout: TIMEOUT_MS }).then(() => true, () => false);
      fs.writeFileSync(stop, "");
      const [found = "", listed = ""] = (await watching).stdout.trim().split(" ");

      assert.equal(Number(found), 0, `A window of the applet showed in ${found} of ${listed} looks.`);
      assert.equal(ended, true, `The applet didn't end within ${TIMEOUT_MS} ms.`);
    } finally {
      fs.writeFileSync(stop, "");
      const [watched] = await Promise.allSettled([watching ?? Promise.resolve(null)]);
      await MacTestWindow.abandonAsync(copy);
      if (watched.status === "rejected")
        throw watched.reason;
    }
  });

  it("reports a stall that recovers, and its waits go on once the loop turns again", async () => {
    await withWindowAsync(async window => {
      window.send("hold");
      assert.equal(await window.takeLineAsync("holding", TIMEOUT_MS), "holding");
      await window.waitPendingAsync(lines => lines.some(t => t.startsWith("stalled ")), TIMEOUT_MS);

      window.resume();

      const pending = await window.waitPendingAsync(lines => lines.includes("resumed"), TIMEOUT_MS);
      assert.ok(pending.findIndex(t => t.startsWith("stalled ")) < pending.indexOf("held"), `The window didn't report the stall before the hold ended: ${JSON.stringify(pending)}.`);
      assert.equal(await window.takeLineAsync("held", TIMEOUT_MS), "held");
      window.send("move 0 0");

      assert.equal(await window.takeLineAsync("moved ", TIMEOUT_MS), "moved 0 0");
    });
  });
});
