/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import readline from "node:readline";

import { type IWindowsDesktopApi, WindowsBackend } from "@noldova/computer-use.runtime/windows";

export class WindowsTestWindow {
  public static readonly START_MS: number = 60_000;

  private static readonly FOLDER: string = path.join(import.meta.dirname, "fixtures");
  private static readonly RECORD: RegExp = /<S S="(\w+)">([^<]*)<\/S>|<AV>([^<]*)<\/AV>.*?<SD>([^<]*)<\/SD>/gs;
  private static readonly TITLE_TIMEOUT_MS: number = 5000;
  private static readonly MAX_BUFFER: string = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";

  public readonly title: string = `Computer use native test ${randomUUID()}`;

  private errors: string = "";
  private failure: Error | null = null;
  private readonly lines: string[] = [];
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly waiters: Set<() => void> = new Set();

  public constructor(script: string = "test-window.ps1", values: Readonly<Record<string, string | number>> = {}, program: string = "powershell.exe") {
    const bringToFront = fs.readFileSync(path.join(WindowsTestWindow.FOLDER, "bring-to-front.ps1"), "utf8");
    const source = Object.entries({ BRING_TO_FRONT: bringToFront, TITLE: this.title, ...values }).reduce((text, [name, value]) => text.replaceAll(`__${name}__`, `${value}`), fs.readFileSync(path.join(WindowsTestWindow.FOLDER, script), "utf8"));
    const command = Buffer.from(source, "utf16le").toString("base64");
    this.process = spawn(program, ["-NoProfile", "-NonInteractive", "-EncodedCommand", command], { windowsHide: false });
    this.process.on("error", (error: Error) => this.fail(error));
    this.process.stdin.on("error", (error: Error) => {
      this.errors += `${String(error)}\n`;
    });
    this.process.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      this.errors += chunk;
    });
    readline.createInterface({ input: this.process.stdout }).on("line", line => {
      this.lines.push(line);
      this.wake();
    });
  }

  public get processId(): number {
    const id = this.process.pid;
    if (id === undefined)
      throw new Error(`The test window's process didn't start: ${String(this.failure)}`);

    return id;
  }

  public async takeLineAsync(prefix: string, timeoutMs: number, titleTimeoutMs: number = WindowsTestWindow.TITLE_TIMEOUT_MS): Promise<string> {
    const taken = await this.takeThroughAsync(prefix, timeoutMs, titleTimeoutMs);

    return taken.at(-1) ?? "";
  }

  public async takeThroughAsync(prefix: string, timeoutMs: number, titleTimeoutMs: number = WindowsTestWindow.TITLE_TIMEOUT_MS): Promise<readonly string[]> {
    return await new Promise((resolve, reject) => {
      const check = (): void => {
        const index = this.lines.findIndex(t => t.startsWith(prefix));
        if (index < 0 && this.failure === null)
          return;
        this.waiters.delete(check);
        clearTimeout(timer);
        if (index < 0)
          reject(new Error(`The test window failed before a "${prefix}" line: ${String(this.failure)}`));
        else
          resolve(this.lines.splice(0, index + 1));
      };
      const timer = setTimeout(() => {
        this.waiters.delete(check);
        const failure = `The test window reported no "${prefix}" line within ${timeoutMs} ms; it reported ${JSON.stringify(this.lines)}, its process ${this.describeExit()}, its errors ${JSON.stringify(WindowsTestWindow.readErrors(this.errors))}`;
        void WindowsTestWindow.describeFrontAsync(titleTimeoutMs)
          .catch((error: unknown) => `the window in front couldn't be named: ${String(error)}`)
          .then(front => reject(new Error(`${failure}, and ${front}.`)));
      }, timeoutMs);
      this.waiters.add(check);
      check();
    });
  }

  public reported(prefix: string): readonly string[] {
    return this.lines.filter(t => t.startsWith(prefix));
  }

  public takePending(): readonly string[] {
    return this.lines.splice(0);
  }

  public async exitAsync(timeoutMs: number): Promise<number | null> {
    if (this.process.exitCode !== null || this.process.signalCode !== null || this.process.pid === undefined)
      return this.process.exitCode;

    return await new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), timeoutMs);
      this.process.once("exit", code => {
        clearTimeout(timer);
        resolve(code);
      });
    });
  }

  public send(line: string): void {
    this.process.stdin.write(`${line}\n`);
  }

  public async closeAsync(timeoutMs: number): Promise<number | null> {
    if (this.process.exitCode !== null || this.process.signalCode !== null || this.process.pid === undefined)
      return this.process.exitCode;

    this.process.stdin.end("close\n");
    const code = await this.exitAsync(timeoutMs);
    if (code === null)
      this.process.kill();

    return code;
  }

  private static readErrors(text: string): readonly string[] {
    const decode = (value: string): string => value.replace(/_x([0-9A-F]{4})_/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&apos;", "'").replaceAll("&amp;", "&");
    const records: string[] = [];
    let stream = "";
    for (const [, name, value = "", activity = "", status = ""] of text.matchAll(WindowsTestWindow.RECORD)) {
      if (name === undefined) {
        records.push(`progress: ${decode(activity)} ${decode(status)}`);
        stream = "";
      } else if (name === stream) {
        records.push(`${records.pop() ?? ""}${decode(value)}`);
      } else {
        records.push(`${name.toLowerCase()}: ${decode(value)}`);
        stream = name;
      }
    }

    const rest = text.replace(/^#< CLIXML\r?\n/, "").replace(/<Objs\b.*?(?:<\/Objs>|$)/gs, "").trim();

    return [...records.map(t => t.trim()), ...rest === "" ? [] : [rest]];
  }

  private static async describeFrontAsync(titleTimeoutMs: number): Promise<string> {
    let front: ReturnType<IWindowsDesktopApi["getForegroundWindow"]>;
    try {
      const addon: IWindowsDesktopApi = createRequire(import.meta.url)(WindowsBackend.addonFile);
      front = addon.getForegroundWindow();
    } catch (error: unknown) {
      return `the window in front couldn't be read: ${String(error)}`;
    }
    if (front === null)
      return "no window is in front";

    const read = `[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false; Add-Type -AssemblyName UIAutomationClient; [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr] ${Number(front.windowId)}).Current.Name`;
    const title = await new Promise<string>(resolve => {
      execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", read], { encoding: "utf8", timeout: titleTimeoutMs, windowsHide: true }, (error, stdout, stderr) => {
        if (error === null)
          resolve(JSON.stringify(stdout.trim()));
        else if (error.code === WindowsTestWindow.MAX_BUFFER)
          resolve(`unread: ${error.message}`);
        else
          resolve(error.killed ? `unread within ${titleTimeoutMs} ms` : `unread: ${JSON.stringify(WindowsTestWindow.readErrors(stderr))}`);
      });
    });

    return `the window in front is ${front.windowId} of process ${front.processId}, ${front.imagePath}, of class ${front.className}, titled ${title}`;
  }

  private fail(error: Error): void {
    this.failure ??= error;
    this.wake();
  }

  private wake(): void {
    for (const waiter of this.waiters)
      waiter();
  }

  private describeExit(): string {
    if (this.process.exitCode !== null)
      return `exited with code ${this.process.exitCode}`;

    return this.process.signalCode === null ? "still runs" : `was ended by ${this.process.signalCode}`;
  }
}
