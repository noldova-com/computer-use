/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IBorderBackend } from "../interfaces/backend/i-border-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import type { BorderFrame } from "../models/backend/border-frame.ts";
import type { Display } from "../models/display.ts";
import { Resources } from "../resources.ts";

export class WindowsBorderBackend implements IBorderBackend {
  private readonly api: IWindowsDesktopApi;

  public constructor(api: IWindowsDesktopApi) {
    this.api = api;
  }

  public unitsPerPixel(display: Display): number {
    return display.scaleFactor;
  }

  public async showAsync(frames: readonly BorderFrame[], color: string, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.api.showBorder(frames.map(t => ({ x: t.bounds.x, y: t.bounds.y, width: t.bounds.width, height: t.bounds.height, thickness: t.thickness })),
      Number.parseInt(color.slice(1), Resources.hexRadix));
  }

  public async hideAsync(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.api.hideBorder();
  }
}
