/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ChildProcess, execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { ChildExit } from "./child-exit.fixture.ts";

const run = promisify(execFile);

export class MacKeyPanel {
  private static readonly SCRIPT: string = path.join(import.meta.dirname, "fixtures", "mac-key-panel.js");
  private static readonly SENTINEL: string = path.join(import.meta.dirname, "fixtures", "mac-sentinel.js");
  private static readonly SENTINEL_LINE: string = "key z";
  private static readonly POLL_MS: number = 50;

  private readonly child: ChildProcess;
  private readonly exit: ChildExit;
  private readonly closeFile: string;
  private readonly folder: string;
  private readonly logFile: string;

  private constructor(folder: string, isSilent: boolean) {
    this.closeFile = path.join(folder, "close");
    this.folder = folder;
    this.logFile = path.join(folder, "log.txt");
    this.child = spawn("/usr/bin/osascript", ["-l", "JavaScript", MacKeyPanel.SCRIPT, this.logFile, this.closeFile, isSilent ? "silent" : "answering"], { stdio: "ignore" });
    this.exit = new ChildExit(this.child);
  }

  public static open(isSilent: boolean): MacKeyPanel {
    return new MacKeyPanel(fs.mkdtempSync(path.join(tmpdir(), "noldova-key-panel-")), isSilent);
  }

  public async readyAsync(timeoutMs: number): Promise<void> {
    await this.waitLinesAsync(t => t.startsWith("ready "), timeoutMs, "become the key window");
  }

  public readLines(): readonly string[] {
    return fs.existsSync(this.logFile) ? fs.readFileSync(this.logFile, "utf8").split("\n").filter(t => t !== "") : [];
  }

  public async takeUntilSentinelAsync(timeoutMs: number): Promise<readonly string[]> {
    await run("/usr/bin/osascript", ["-l", "JavaScript", MacKeyPanel.SENTINEL, "key"], { timeout: timeoutMs });
    const lines = await this.waitLinesAsync(t => t === MacKeyPanel.SENTINEL_LINE, timeoutMs, `log the sentinel's "${MacKeyPanel.SENTINEL_LINE}"`);

    return lines.slice(0, lines.indexOf(MacKeyPanel.SENTINEL_LINE));
  }

  public async closeAsync(timeoutMs: number): Promise<void> {
    fs.writeFileSync(this.closeFile, "");
    if (!(await this.exit.waitAsync(timeoutMs))) {
      this.child.kill();
      await this.exit.waitAsync(timeoutMs);
    }
    fs.rmSync(this.folder, { recursive: true, force: true });
  }

  private async waitLinesAsync(isWanted: (line: string) => boolean, timeoutMs: number, what: string): Promise<readonly string[]> {
    for (const end = performance.now() + timeoutMs; ; await delay(MacKeyPanel.POLL_MS)) {
      const lines = this.readLines();
      if (lines.some(isWanted))
        return lines;
      if (this.exit.hasExited)
        throw new Error(`The key panel ended before it could ${what}; it logged ${JSON.stringify(lines)}.`);
      if (performance.now() >= end)
        throw new Error(`The key panel didn't ${what} within ${timeoutMs} ms; it logged ${JSON.stringify(lines)}.`);
    }
  }
}
