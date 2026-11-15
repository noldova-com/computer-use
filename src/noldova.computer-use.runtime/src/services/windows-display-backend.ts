/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import { Display } from "../models/display.ts";
import { Resources } from "../resources.ts";

export class WindowsDisplayBackend implements IDisplayBackend {
  private readonly api: IWindowsDesktopApi;

  public constructor(api: IWindowsDesktopApi) {
    this.api = api;
  }

  public async listDisplaysAsync(signal: AbortSignal): Promise<readonly Display[]> {
    signal.throwIfAborted();

    return this.api.listDisplays().map(t => new Display(t.id, t.x, t.y, t.width, t.height, t.dpi / Resources.windowsBaseDpi, t.isPrimary));
  }
}
