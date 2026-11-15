/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface IPoint {
  readonly x: number;
  readonly y: number;
}

interface IReadyLine {
  readonly processId: number;
  readonly windowNumber: number;
  readonly secureField: IPoint;
  readonly start: IPoint;
}

export class MacTestWindow {
  public static readonly START_MS: number = 10_000;
  public static readonly BUNDLE_ID: string = "com.noldova.computer-use.NativeTestWindow";

  private static readonly SCRIPT: string = path.join(import.meta.dirname, "fixtures", "mac-test-window.js");
  private static readonly WARP: string = path.join(import.meta.dirname, "fixtures", "mac-warp.js");
  private static readonly FRONT: string = path.join(import.meta.dirname, "fixtures", "mac-front.js");
  private static readonly SENTINEL: string = path.join(import.meta.dirname, "fixtures", "mac-sentinel.js");
  private static readonly APP: string = "NoldovaTestWindow.app";
  private static readonly POLL_MS: number = 50;
  private static readonly STALLED: string = "stalled ";
  private static readonly RESUMED: string = "resumed";
  private static readonly READY: string = "ready ";
  private static readonly READY_FIELDS: number = 9;
  private static readonly MARKER_IN_CONTENT: IPoint = { x: 100, y: 100 };
  private static readonly CONTENT_HEIGHT: number = 400;
  private static readonly SENTINEL_SPOTS: readonly IPoint[] = [
    { x: 40, y: 360 }, { x: 40, y: 40 }, { x: 200, y: 250 }, { x: 330, y: 330 }, { x: 610, y: 200 }, { x: 610, y: 385 }, { x: 40, y: 220 }
  ];
  private static readonly NO_PROCESS_MATCHED: number = 1;

  public readonly bundleId: string;
  public readonly folder: string;
  public readonly title: string;

  private readonly closeFile: string;
  private readonly logFile: string;
  private readonly resumeFile: string;
  private taken: number = 0;
  private ready: IReadyLine | null = null;
  private pointer: IPoint | null = null;

  private constructor(folder: string, title: string, bundleId: string) {
    this.bundleId = bundleId;
    this.closeFile = path.join(folder, "close");
    this.folder = folder;
    this.logFile = path.join(folder, "log.txt");
    this.resumeFile = path.join(folder, "resume");
    this.title = title;
  }

  public static async openAsync(bundleId: string = MacTestWindow.BUNDLE_ID, signal: AbortSignal | null = null): Promise<MacTestWindow> {
    const folder = fs.mkdtempSync(path.join(tmpdir(), "noldova-test-window-"));
    const title = `Computer use native test ${randomUUID()}`;
    const script = fs.readFileSync(MacTestWindow.SCRIPT, "utf8")
      .replace("__TITLE__", title)
      .replace("__LOG__", path.join(folder, "log.txt"))
      .replace("__CLOSE__", path.join(folder, "close"))
      .replace("__COMMAND__", path.join(folder, "command"))
      .replace("__RELEASE__", path.join(folder, "release"))
      .replace("__RESUME__", path.join(folder, "resume"));
    const limit = signal === null ? { timeout: MacTestWindow.START_MS } : { timeout: MacTestWindow.START_MS, signal };
    const app = path.join(folder, MacTestWindow.APP);
    try {
      fs.writeFileSync(path.join(folder, "test-window.js"), script);
      await run("/usr/bin/mkfifo", [path.join(folder, "release")], limit);
      await run("/usr/bin/osacompile", ["-l", "JavaScript", "-o", app, path.join(folder, "test-window.js")], limit);
      await run("/usr/bin/plutil", ["-replace", "CFBundleIdentifier", "-string", bundleId, path.join(app, "Contents", "Info.plist")], limit);
      await run("/usr/bin/codesign", ["--force", "--sign", "-", app], limit);
      await run("/usr/bin/open", ["-n", app, "--args", "-ApplePersistenceIgnoreState", "YES"], limit);
    } catch (error) {
      await MacTestWindow.abandonAsync(folder);

      throw error;
    }

    return new MacTestWindow(folder, title, bundleId.toLowerCase());
  }

  public static async abandonAsync(folder: string): Promise<void> {
    await MacTestWindow.endByFolderAsync(folder, MacTestWindow.START_MS);
    fs.rmSync(folder, { recursive: true, force: true });
  }

  public static async warpAsync(point: IPoint, timeoutMs: number): Promise<IPoint> {
    return await MacTestWindow.warpWithAsync(point, { timeout: timeoutMs });
  }

  public static async describeFrontAsync(timeoutMs: number, signal: AbortSignal | null = null): Promise<string> {
    try {
      const { stdout } = await run("/usr/bin/osascript", ["-l", "JavaScript", MacTestWindow.FRONT], signal === null ? { timeout: timeoutMs } : { timeout: timeoutMs, signal });

      return stdout.trim();
    } catch (error) {
      return `not described: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  public static async readFrontProcessAsync(timeoutMs: number): Promise<number | null> {
    const { stdout } = await run("/usr/bin/osascript", ["-l", "JavaScript", MacTestWindow.FRONT], { timeout: timeoutMs });

    return MacTestWindow.readFrontProcess(JSON.parse(stdout));
  }

  private static readFrontProcess(described: unknown): number | null {
    if (typeof described !== "object" || described === null || !("front" in described))
      throw new Error(`The description of the front holds no front: ${JSON.stringify(described)}.`);
    const front = described.front;
    if (front === null)
      return null;
    if (typeof front !== "object" || !("pid" in front) || typeof front.pid !== "number")
      throw new Error(`The description's front has no process: ${JSON.stringify(front)}.`);

    return front.pid;
  }

  private static async warpWithAsync(point: IPoint, options: { readonly timeout: number; readonly signal?: AbortSignal }): Promise<IPoint> {
    const { stdout } = await run("/usr/bin/osascript", ["-l", "JavaScript", MacTestWindow.WARP, String(point.x), String(point.y)], options);

    return MacTestWindow.readPoint(stdout.trim().split(" "), stdout);
  }

  private static readPoint(parts: readonly string[], line: string): IPoint {
    const [x, y] = parts.map(Number);
    if (parts.length !== 2 || x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y))
      throw new Error(`"${line.trim()}" isn't a point.`);

    return { x, y };
  }

  private static readReady(line: string): IReadyLine {
    const numbers = line.split(" ").slice(1).map(Number);
    const [processId, windowNumber, , , secureX, secureY, startX, startY] = numbers;
    if (numbers.length !== MacTestWindow.READY_FIELDS - 1 || numbers.some(t => !Number.isFinite(t)) || processId === undefined || windowNumber === undefined
      || secureX === undefined || secureY === undefined || startX === undefined || startY === undefined)
      throw new Error(`The test window's ready line "${line}" isn't whole.`);

    return { processId, windowNumber, secureField: { x: secureX, y: secureY }, start: { x: startX, y: startY } };
  }

  private static findStall(lines: readonly string[]): string | null {
    const index = lines.findLastIndex(t => t.startsWith(MacTestWindow.STALLED) || t === MacTestWindow.RESUMED);
    const line = lines[index] ?? MacTestWindow.RESUMED;

    return line === MacTestWindow.RESUMED ? null : line;
  }

  private static readPostedSpot(output: string): IPoint {
    const [word, x, y] = output.trim().split(" ");
    const spot = { x: Number(x), y: Number(y) };
    if (word !== "posted" || !Number.isFinite(spot.x) || !Number.isFinite(spot.y))
      throw new Error(`The sentinel answered "${output.trim()}", not the spot it clicked.`);

    return spot;
  }

  private static isSentinelClick(line: string, spot: IPoint): boolean {
    const [name, x, y] = line.split(" ");

    return name === "click" && Math.abs(Number(x) - (spot.x - MacTestWindow.MARKER_IN_CONTENT.x)) <= 1
      && Math.abs(Number(y) - (spot.y - MacTestWindow.MARKER_IN_CONTENT.y)) <= 1;
  }

  private static isNoProcessMatched(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === MacTestWindow.NO_PROCESS_MATCHED;
  }

  private static isErrno(error: unknown, code: string): boolean {
    return error instanceof Error && "code" in error && error.code === code;
  }

  private static async isFolderRunningAsync(folder: string, timeoutMs: number): Promise<boolean> {
    try {
      await run("/usr/bin/pgrep", ["-f", folder], { timeout: timeoutMs });
      return true;
    } catch (error) {
      if (MacTestWindow.isNoProcessMatched(error))
        return false;
      throw error;
    }
  }

  private static async endByFolderAsync(folder: string, timeoutMs: number): Promise<void> {
    try {
      await run("/usr/bin/pkill", ["-f", folder], { timeout: timeoutMs });
    } catch (error) {
      if (!MacTestWindow.isNoProcessMatched(error))
        throw error;
    }
  }

  public get pid(): number {
    return this.ready?.processId ?? 0;
  }

  public get windowNumber(): number {
    return this.readReadyLine().windowNumber;
  }

  public get secureField(): IPoint {
    return this.readReadyLine().secureField;
  }

  public get start(): IPoint {
    return this.readReadyLine().start;
  }

  public async takeLineAsync(prefix: string, timeoutMs: number): Promise<string> {
    const lines = await this.waitLinesAsync(t => t.startsWith(prefix), `a "${prefix}" line`, timeoutMs);
    const line = lines.at(-1) ?? "";
    if (prefix.startsWith(MacTestWindow.READY)) {
      this.ready = MacTestWindow.readReady(line);
      this.pointer = await MacTestWindow.warpAsync(this.ready.start, timeoutMs);
    }

    return line;
  }

  public async takeUntilSentinelAsync(timeoutMs: number): Promise<readonly string[]> {
    const { processId, windowNumber } = this.readReadyLine();
    const spots = MacTestWindow.SENTINEL_SPOTS.map(t => `${t.x},${t.y}`).join(";");
    const { stdout } = await run("/usr/bin/osascript", ["-l", "JavaScript", MacTestWindow.SENTINEL, "click", String(windowNumber), String(processId), String(MacTestWindow.CONTENT_HEIGHT), spots],
      { timeout: timeoutMs });
    const spot = MacTestWindow.readPostedSpot(stdout);

    return (await this.waitLinesAsync(t => MacTestWindow.isSentinelClick(t, spot), "the sentinel's click", timeoutMs)).slice(0, -1);
  }

  public async waitPendingAsync(isWanted: (lines: readonly string[]) => boolean, timeoutMs: number): Promise<readonly string[]> {
    const end = performance.now() + timeoutMs;
    for (let pending = this.readPending(); ; pending = this.readPending()) {
      if (isWanted(pending))
        return pending;
      if (performance.now() >= end)
        throw new Error(`The test window didn't log the lines awaited within ${timeoutMs} ms; it logged ${JSON.stringify(pending)}.`);
      await delay(MacTestWindow.POLL_MS);
    }
  }

  public readPending(): readonly string[] {
    return this.readLines().slice(this.taken);
  }

  public takePending(): readonly string[] {
    const lines = this.readLines();
    const pending = lines.slice(this.taken);
    this.taken = lines.length;

    return pending;
  }

  public async exitAsync(timeoutMs: number): Promise<boolean> {
    const end = performance.now() + timeoutMs;
    while (this.isRunning()) {
      if (performance.now() >= end)
        return false;
      await delay(MacTestWindow.POLL_MS);
    }

    return true;
  }

  public send(line: string): void {
    const file = path.join(this.folder, "command");
    fs.writeFileSync(`${file}.next`, line);
    fs.renameSync(`${file}.next`, file);
  }

  public resume(): void {
    fs.writeFileSync(this.resumeFile, "");
  }

  public async bringToFrontAsync(timeoutMs: number): Promise<void> {
    await run("/usr/bin/open", [path.join(this.folder, MacTestWindow.APP)], { timeout: timeoutMs });
    this.send("front");
    await this.takeLineAsync("front", timeoutMs);
  }

  public async releaseAsync(timeoutMs: number): Promise<void> {
    const end = performance.now() + timeoutMs;
    for (;;) {
      try {
        const pipe = fs.openSync(path.join(this.folder, "release"), fs.constants.O_WRONLY | fs.constants.O_NONBLOCK);
        fs.writeSync(pipe, "x");
        fs.closeSync(pipe);
        return;
      } catch (error) {
        if (!MacTestWindow.isErrno(error, "ENXIO") || performance.now() >= end)
          throw error;
      }
      await delay(MacTestWindow.POLL_MS);
    }
  }

  public async closeAsync(timeoutMs: number, restoreSignal: AbortSignal | null = null): Promise<boolean> {
    const [ended] = await Promise.allSettled([this.endAsync(timeoutMs)]);
    const restoring = this.pointer === null ? Promise.resolve(null) : MacTestWindow.warpWithAsync(this.pointer, restoreSignal === null ? { timeout: timeoutMs } : { timeout: timeoutMs, signal: restoreSignal });
    const [restored] = await Promise.allSettled([restoring]);
    if (ended.status === "rejected" && restored.status === "rejected")
      throw new AggregateError([ended.reason, restored.reason], "The test window's close and the pointer's restore both failed.");
    if (restored.status === "rejected")
      throw restored.reason;
    if (ended.status === "rejected")
      throw ended.reason;

    return ended.value;
  }

  private readReadyLine(): IReadyLine {
    if (this.ready === null)
      throw new Error("The test window hasn't reported itself ready.");

    return this.ready;
  }

  private async waitLinesAsync(isWanted: (line: string) => boolean, what: string, timeoutMs: number): Promise<readonly string[]> {
    const end = performance.now() + timeoutMs;
    for (;;) {
      const lines = this.readLines();
      const index = lines.findIndex((t, i) => i >= this.taken && isWanted(t));
      const stalled = MacTestWindow.findStall(lines);
      if (index < 0 && stalled !== null)
        throw new Error(`The test window stopped answering before ${what}: ${stalled}`);
      if (index >= 0) {
        const taken = lines.slice(this.taken, index + 1);
        this.taken = index + 1;
        return taken;
      }
      if (performance.now() >= end)
        throw new Error(`The test window reported no ${what} within ${timeoutMs} ms; it reported ${JSON.stringify(lines.slice(this.taken))}.`);
      await delay(MacTestWindow.POLL_MS);
    }
  }

  private async endAsync(timeoutMs: number): Promise<boolean> {
    if (fs.existsSync(this.folder))
      fs.writeFileSync(this.closeFile, "");
    const hasClosed = this.ready === null ? await this.endUnreadyAsync(timeoutMs) : await this.exitAsync(timeoutMs);
    if (!hasClosed && this.ready !== null)
      process.kill(this.ready.processId);
    fs.rmSync(this.folder, { recursive: true, force: true });

    return hasClosed;
  }

  private async endUnreadyAsync(timeoutMs: number): Promise<boolean> {
    const end = performance.now() + timeoutMs;
    while (await MacTestWindow.isFolderRunningAsync(this.folder, timeoutMs)) {
      if (performance.now() >= end) {
        await MacTestWindow.endByFolderAsync(this.folder, timeoutMs);
        return false;
      }
      await delay(MacTestWindow.POLL_MS);
    }

    return true;
  }

  private isRunning(): boolean {
    if (this.ready === null)
      return false;
    try {
      process.kill(this.ready.processId, 0);
      return true;
    } catch (error) {
      if (MacTestWindow.isErrno(error, "ESRCH"))
        return false;
      throw error;
    }
  }

  private readLines(): readonly string[] {
    return fs.existsSync(this.logFile) ? fs.readFileSync(this.logFile, "utf8").split("\n").filter(t => t !== "") : [];
  }
}
