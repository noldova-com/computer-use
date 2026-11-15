/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ScreenFrame } from "../models/screen-frame.ts";

export class ScreenFrames {
  private count: number = 0;
  private readonly latest: Map<string, ScreenFrame> = new Map();

  public nextId(): string {
    this.count += 1;

    return String(this.count);
  }

  public find(sessionId: string): ScreenFrame | undefined {
    return this.latest.get(sessionId);
  }

  public set(sessionId: string, frame: ScreenFrame): void {
    this.latest.set(sessionId, frame);
  }

  public endSession(sessionId: string): void {
    this.latest.delete(sessionId);
  }
}
