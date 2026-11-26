/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export class Pointer {
  private static readonly FOLDER: string = path.join(import.meta.dirname, "scripts");
  private static readonly POSITION: RegExp = /^(-?\d+),(-?\d+)$/;
  private static readonly TARGET_VARIABLE: string = "NOLDOVA_POINTER_TARGET";

  public readonly x: number;
  public readonly y: number;

  private constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public static async readAsync(): Promise<Pointer> {
    return Pointer.parse(await Pointer.runAsync(null));
  }

  public async restoreAsync(): Promise<void> {
    const back = Pointer.parse(await Pointer.runAsync(this));
    if (back.x !== this.x || back.y !== this.y)
      throw new Error(`The pointer reads ${back.x},${back.y} after it was put back at ${this.x},${this.y}.`);
  }

  private static parse(stdout: string): Pointer {
    const match = Pointer.POSITION.exec(stdout.trim());
    if (match?.[1] === undefined || match[2] === undefined)
      throw new Error(`The pointer's helper printed ${JSON.stringify(stdout)} rather than a position such as "120,340".`);
    return new Pointer(Number(match[1]), Number(match[2]));
  }

  private static async runAsync(target: Pointer | null): Promise<string> {
    if (process.platform === "win32") {
      const source = await readFile(path.join(Pointer.FOLDER, "pointer.ps1"), "utf8");
      const env = target === null ? process.env : { ...process.env, [Pointer.TARGET_VARIABLE]: `${target.x},${target.y}` };
      return (await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")], { encoding: "utf8", windowsHide: true, env })).stdout;
    }
    const position = target === null ? [] : [String(target.x), String(target.y)];
    return (await run("/usr/bin/osascript", ["-l", "JavaScript", path.join(Pointer.FOLDER, "pointer.js"), ...position], { encoding: "utf8" })).stdout;
  }
}
