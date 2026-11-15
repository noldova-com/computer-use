/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import readline from "node:readline";

import type { DesktopPoint } from "@noldova/computer-use.runtime";

import { ChildLines } from "./child-lines.fixture.ts";
import type { IPointerSample } from "./glide-recording.fixture.ts";

export class MacPointerRecorder {
  private static readonly SCRIPT: string = path.join(import.meta.dirname, "fixtures", "mac-pointer-recorder.js");
  private static readonly MARKS: readonly string[] = ["ready", "left", ""];

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: ChildLines;
  private readonly exited: Promise<void>;

  private constructor(from: DesktopPoint, spanMs: number, timeoutMs: number, stopPath: string | null) {
    const stop = stopPath === null ? [] : [stopPath];
    this.child = spawn("/usr/bin/osascript", ["-l", "JavaScript", MacPointerRecorder.SCRIPT, String(from.x), String(from.y), String(spanMs), String(timeoutMs), ...stop]);
    this.lines = new ChildLines("The pointer recorder", this.child, readline.createInterface({ input: this.child.stdout }));
    this.exited = new Promise(resolve => this.child.once("exit", () => resolve()));
  }

  public static async startAsync(from: DesktopPoint, spanMs: number, timeoutMs: number, stopPath: string | null = null): Promise<MacPointerRecorder> {
    const recorder = new MacPointerRecorder(from, spanMs, timeoutMs, stopPath);
    try {
      await recorder.lines.waitAsync("ready", timeoutMs);
    } catch (error) {
      await recorder.endAsync();

      throw error;
    }

    return recorder;
  }

  private static readSample(line: string): IPointerSample {
    const numbers = line.split(" ").map(Number);
    const [atMs, x, y] = numbers;
    if (numbers.length !== 3 || atMs === undefined || x === undefined || y === undefined || numbers.some(t => !Number.isFinite(t)))
      throw new Error(`The pointer recorder's reading "${line}" isn't a time and a point.`);

    return { atMs, x: Math.round(x), y: Math.round(y) };
  }

  public async endAsync(): Promise<void> {
    if (this.child.exitCode === null && this.child.signalCode === null)
      this.child.kill();
    await this.exited;
  }

  public async samplesAsync(): Promise<readonly IPointerSample[]> {
    await this.exited;
    const readings = this.lines.all().filter(t => !MacPointerRecorder.MARKS.includes(t)).map(MacPointerRecorder.readSample);
    const first = readings[0]?.atMs ?? 0;

    return readings.map(t => ({ atMs: t.atMs - first, x: t.x, y: t.y }));
  }
}
