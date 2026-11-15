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

export class StopKey {
  private static readonly FOLDER: string = path.join(import.meta.dirname, "scripts");
  private static readonly PRESSED: string = "pressed";

  public static async pressAsync(): Promise<void> {
    const stdout = process.platform === "win32" ? await StopKey.pressOnWindowsAsync() : await StopKey.pressOnMacAsync();
    if (stdout.trim() !== StopKey.PRESSED)
      throw new Error(`The stop key's helper printed ${JSON.stringify(stdout)} rather than "${StopKey.PRESSED}".`);
  }

  private static async pressOnWindowsAsync(): Promise<string> {
    const source = await readFile(path.join(StopKey.FOLDER, "press-stop-key.ps1"), "utf8");
    return (await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")], { encoding: "utf8", windowsHide: true })).stdout;
  }

  private static async pressOnMacAsync(): Promise<string> {
    return (await run("/usr/bin/osascript", ["-l", "JavaScript", path.join(StopKey.FOLDER, "press-stop-key.js")], { encoding: "utf8" })).stdout;
  }
}
