/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import { Display } from "../models/display.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacDisplayBackend implements IDisplayBackend {
  private readonly api: MacDesktopApi;

  public constructor(api: MacDesktopApi) {
    this.api = api;
  }

  public async listDisplaysAsync(signal: AbortSignal): Promise<readonly Display[]> {
    signal.throwIfAborted();

    return (await this.api.listDisplaysAsync()).map(t => new Display(t.id, t.x, t.y, t.width, t.height, t.scaleFactor, t.isPrimary));
  }
}
