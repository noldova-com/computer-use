/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { addAbortListener } from "node:events";
import type { TestContext } from "node:test";

import type { BorderFrame } from "@noldova/computer-use.runtime";

import type { BorderBackendDouble } from "../doubles/border-backend-double.fixture.ts";
import { HangGuard } from "./hang-guard.fixture.ts";

export class BorderCalls {
  private readonly border: BorderBackendDouble;
  private readonly waiters: (() => void)[] = [];

  public constructor(t: TestContext, border: BorderBackendDouble) {
    this.border = border;
    const show = border.showAsync.bind(border);
    const hide = border.hideAsync.bind(border);
    t.mock.method(border, "showAsync", async (frames: readonly BorderFrame[], color: string, signal: AbortSignal): Promise<void> => {
      try {
        await show(frames, color, signal);
      } finally {
        this.notify();
      }
    });
    t.mock.method(border, "hideAsync", async (signal: AbortSignal): Promise<void> => {
      try {
        await hide(signal);
      } finally {
        this.notify();
      }
    });
  }

  public get count(): number {
    return this.border.calls.length;
  }

  public async reachAsync(count: number): Promise<void> {
    const guard = HangGuard.signal();
    while (this.border.calls.length < count)
      await new Promise<void>((resolve, reject) => {
        const hang = addAbortListener(guard, () => reject(new Error(`The border backend had ${this.count} calls, not the ${count} the test waited for.`)));
        this.waiters.push(() => {
          hang[Symbol.dispose]();
          resolve();
        });
      });
  }

  public async nextAsync(): Promise<void> {
    await this.reachAsync(this.count + 1);
  }

  private notify(): void {
    for (const resolve of this.waiters.splice(0))
      resolve();
  }
}
