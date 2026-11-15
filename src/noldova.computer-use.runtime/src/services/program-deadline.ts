/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import timers from "node:timers/promises";

export class ProgramDeadline {
  public readonly signal: AbortSignal;
  private readonly expiry: AbortController = new AbortController();
  private readonly timer: AbortController = new AbortController();

  public constructor(signal: AbortSignal, timeoutMs: number) {
    this.signal = AbortSignal.any([signal, this.expiry.signal]);
    void timers.setTimeout(timeoutMs, undefined, { ref: false, signal: this.timer.signal }).then(() => this.expiry.abort(), () => undefined);
  }

  public get hasExpired(): boolean {
    return this.expiry.signal.aborted;
  }

  public end(): void {
    this.timer.abort();
  }
}
