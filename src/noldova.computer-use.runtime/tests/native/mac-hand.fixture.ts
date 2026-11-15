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

import { DesktopPoint } from "@noldova/computer-use.runtime";

import { ChildLines } from "./child-lines.fixture.ts";

export interface IHandRise {
  readonly count: number;
  readonly atMs: number;
}

export interface IHandCount {
  readonly events: number;
  readonly pointer: DesktopPoint;
  readonly times: string;
  readonly postedMs: number | null;
  readonly rises: readonly IHandRise[];
}

export class MacHand {
  private static readonly SCRIPT: string = path.join(import.meta.dirname, "fixtures", "mac-hand.js");
  private static readonly COUNTED: string = "counted ";
  private static readonly TIMES: string = "times ";

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: ChildLines;
  private readonly exited: Promise<void>;

  private constructor(parameters: readonly string[]) {
    this.child = spawn("/usr/bin/osascript", ["-l", "JavaScript", MacHand.SCRIPT, ...parameters]);
    this.lines = new ChildLines("The hand", this.child, readline.createInterface({ input: this.child.stdout }));
    this.exited = new Promise(resolve => this.child.once("exit", () => resolve()));
  }

  public static async startCountedAsync(to: DesktopPoint, timeoutMs: number): Promise<MacHand> {
    return await MacHand.readyAsync(new MacHand([String(to.x), String(to.y), String(timeoutMs)]), timeoutMs);
  }

  private static async readyAsync(hand: MacHand, timeoutMs: number): Promise<MacHand> {
    try {
      await hand.lines.waitAsync("ready", timeoutMs);
    } catch (error) {
      await hand.endAsync();

      throw error;
    }

    return hand;
  }

  private static readCount(line: string): readonly number[] {
    const numbers = line.slice(MacHand.COUNTED.length).split(" ").map(Number);
    if (numbers.length !== 3 || numbers.some(t => !Number.isFinite(t)))
      throw new Error(`The hand's count "${line}" isn't three numbers.`);

    return numbers;
  }

  private static readPosted(times: string): number | null {
    const posted = /^posted (none|[\d.]+),/.exec(times)?.[1];
    if (posted === undefined)
      throw new Error(`The hand's times "${times}" name no post.`);

    return posted === "none" ? null : Number(posted);
  }

  private static readRises(times: string): readonly IHandRise[] {
    return [...times.matchAll(/(\d+) at ([\d.]+)/g)].map(t => ({ count: Number(t[1]), atMs: Number(t[2]) }));
  }

  public async armAsync(events: number, afterMs: number, timeoutMs: number, holdMs: number = 0): Promise<void> {
    this.child.stdin.write(`${events} ${afterMs} ${holdMs}\n`);
    await this.lines.waitAsync("armed", timeoutMs);
  }

  public async countedAsync(timeoutMs: number): Promise<IHandCount> {
    const [events = 0, x = 0, y = 0] = MacHand.readCount(await this.lines.waitAsync(MacHand.COUNTED, timeoutMs));
    const times = (await this.lines.waitAsync(MacHand.TIMES, timeoutMs)).slice(MacHand.TIMES.length);

    return { events, pointer: new DesktopPoint(x, y), times, postedMs: MacHand.readPosted(times), rises: MacHand.readRises(times) };
  }

  public async endAsync(): Promise<void> {
    if (this.child.exitCode === null && this.child.signalCode === null)
      this.child.kill();
    await this.exited;
  }
}
