/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { ChildExit } from "./child-exit.fixture.ts";

export class MacCoverWindow {
  private static readonly SCRIPT: string = path.join(import.meta.dirname, "fixtures", "mac-cover-window.js");
  private static readonly POLL_MS: number = 50;
  private static readonly READY: string = "ready ";

  private readonly child: ChildProcess;
  private readonly exit: ChildExit;
  private readonly closeFile: string;
  private readonly folder: string;
  private readonly logFile: string;

  private constructor(folder: string, x: number, y: number, width: number, height: number) {
    this.closeFile = path.join(folder, "close");
    this.folder = folder;
    this.logFile = path.join(folder, "log.txt");
    this.child = spawn("/usr/bin/osascript", ["-l", "JavaScript", MacCoverWindow.SCRIPT, ...[x, y, width, height].map(String), this.logFile, this.closeFile], { stdio: "ignore" });
    this.exit = new ChildExit(this.child);
  }

  public static open(x: number, y: number, width: number, height: number): MacCoverWindow {
    return new MacCoverWindow(fs.mkdtempSync(path.join(tmpdir(), "noldova-cover-window-")), x, y, width, height);
  }

  public async readyAsync(timeoutMs: number): Promise<string> {
    for (const end = performance.now() + timeoutMs; ; await delay(MacCoverWindow.POLL_MS)) {
      const line = fs.existsSync(this.logFile) ? fs.readFileSync(this.logFile, "utf8").trim() : "";
      const windowNumber = line.slice(MacCoverWindow.READY.length);
      if (line.startsWith(MacCoverWindow.READY) && /^\d+$/.test(windowNumber))
        return windowNumber;
      if (this.exit.hasExited)
        throw new Error(`The cover window ended before it showed${this.exit.error === null ? "" : `: ${this.exit.error.message}`}.`);
      if (performance.now() >= end)
        throw new Error(`The cover window didn't show within ${timeoutMs} ms.`);
    }
  }

  public async closeAsync(timeoutMs: number): Promise<void> {
    fs.writeFileSync(this.closeFile, "");
    if (!(await this.exit.waitAsync(timeoutMs))) {
      this.child.kill();
      await this.exit.waitAsync(timeoutMs);
    }
    fs.rmSync(this.folder, { recursive: true, force: true });
  }
}
