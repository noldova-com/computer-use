/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BorderFrame, Display, IBorderBackend } from "@noldova/computer-use.runtime";

export class BorderBackendDouble implements IBorderBackend {
  public readonly calls: ({ readonly color: string; readonly frames: readonly (readonly number[])[] } | null)[] = [];
  public hideFailure: Error | null = null;
  public showFailure: Error | null = null;
  public units: number = 1;

  public unitsPerPixel(_display: Display): number {
    return this.units;
  }

  public async showAsync(frames: readonly BorderFrame[], color: string, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.calls.push({ color, frames: frames.map(t => [t.bounds.x, t.bounds.y, t.bounds.width, t.bounds.height, t.thickness]) });
    if (this.showFailure !== null)
      throw this.showFailure;
  }

  public async hideAsync(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.calls.push(null);
    if (this.hideFailure !== null)
      throw this.hideFailure;
  }
}
