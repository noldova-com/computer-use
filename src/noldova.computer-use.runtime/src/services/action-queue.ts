/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CallFailures } from "./call-failures.ts";

export class ActionQueue {
  private tail: Promise<void> = Promise.resolve();

  public async runAsync<T>(signal: AbortSignal, action: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    const turn = Promise.withResolvers<void>();
    this.tail = turn.promise;
    try {
      await ActionQueue.waitForTurnAsync(previous, signal);

      return await action();
    } finally {
      void previous.then(turn.resolve);
    }
  }

  private static async waitForTurnAsync(previous: Promise<void>, signal: AbortSignal): Promise<void> {
    const aborted = Promise.withResolvers<void>();
    const abort = (): void => aborted.reject(CallFailures.ofAbort(signal, false));
    if (signal.aborted)
      abort();
    signal.addEventListener("abort", abort, { once: true });
    try {
      await Promise.race([previous, aborted.promise]);
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }
}
