/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IBorderBackend } from "../interfaces/backend/i-border-backend.ts";
import type { BorderFrame } from "../models/backend/border-frame.ts";
import type { Display } from "../models/display.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacBorderBackend implements IBorderBackend {
  private readonly api: MacDesktopApi;

  public constructor(api: MacDesktopApi) {
    this.api = api;
  }

  public unitsPerPixel(_display: Display): number {
    return 1;
  }

  public async showAsync(frames: readonly BorderFrame[], color: string, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    await this.api.showBorderAsync(frames.map(t => ({ x: t.bounds.x, y: t.bounds.y, width: t.bounds.width, height: t.bounds.height, thickness: t.thickness })), color);
  }

  public async hideAsync(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    await this.api.hideBorderAsync();
  }
}
