/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ChildProcess } from "node:child_process";
import type { Interface } from "node:readline";

export class ChildLines {
  private readonly name: string;
  private readonly child: ChildProcess;
  private readonly reader: Interface;
  private readonly lines: string[] = [];
  private isClosed: boolean = false;
  private failure: Error | null = null;

  public constructor(name: string, child: ChildProcess, reader: Interface) {
    this.name = name;
    this.child = child;
    this.reader = reader;
    reader.on("line", line => this.lines.push(line));
    reader.once("close", () => {
      this.isClosed = true;
    });
    child.on("error", error => {
      this.failure = error;
    });
  }

  public all(): readonly string[] {
    return [...this.lines];
  }

  public async waitAsync(prefix: string, timeoutMs: number): Promise<string> {
    const found = this.lines.find(t => t.startsWith(prefix));
    if (found !== undefined)
      return found;
    if (this.failure !== null)
      throw this.failure;
    if (this.isClosed)
      throw new Error(`${this.name} ended before it wrote "${prefix}"; it wrote ${JSON.stringify(this.lines)}.`);
    const signal = AbortSignal.timeout(timeoutMs);

    return await new Promise<string>((resolve, reject) => {
      const stop = (): void => {
        this.reader.off("line", onLine);
        this.reader.off("close", onClose);
        this.child.off("error", onError);
        signal.removeEventListener("abort", onAbort);
      };
      const onLine = (line: string): void => {
        if (!line.startsWith(prefix))
          return;
        stop();
        resolve(line);
      };
      const onClose = (): void => {
        stop();
        reject(new Error(`${this.name} ended before it wrote "${prefix}"; it wrote ${JSON.stringify(this.lines)}.`));
      };
      const onError = (error: Error): void => {
        stop();
        reject(error);
      };
      const onAbort = (): void => {
        stop();
        reject(new Error(`${this.name} didn't write "${prefix}" within ${timeoutMs} ms; it wrote ${JSON.stringify(this.lines)}.`));
      };
      this.reader.on("line", onLine);
      this.reader.once("close", onClose);
      this.child.once("error", onError);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
}
