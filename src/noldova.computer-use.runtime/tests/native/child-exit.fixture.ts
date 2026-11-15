/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ChildProcess } from "node:child_process";

export class ChildExit {
  private readonly exited: Promise<void>;
  private isDone: boolean = false;
  private failure: Error | null = null;

  public constructor(child: ChildProcess) {
    this.exited = new Promise(resolve => {
      child.once("exit", () => {
        this.isDone = true;
        resolve();
      });
      child.once("error", error => {
        this.failure = error;
        this.isDone = true;
        resolve();
      });
    });
  }

  public get hasExited(): boolean {
    return this.isDone;
  }

  public get error(): Error | null {
    return this.failure;
  }

  public async waitAsync(timeoutMs: number): Promise<boolean> {
    const signal = AbortSignal.timeout(timeoutMs);
    const aborted = new Promise<void>(resolve => signal.addEventListener("abort", () => resolve(), { once: true }));
    await Promise.race([this.exited, aborted]);

    return this.isDone;
  }
}
