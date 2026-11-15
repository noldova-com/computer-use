/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { WindowReading } from "../models/window-reading.ts";

export class WindowReadings {
  private readonly latest: Map<string, WindowReading> = new Map();

  public find(sessionId: string): WindowReading | undefined {
    return this.latest.get(sessionId);
  }

  public set(sessionId: string, reading: WindowReading): void {
    this.latest.set(sessionId, reading);
  }

  public endSession(sessionId: string): void {
    this.latest.delete(sessionId);
  }
}
