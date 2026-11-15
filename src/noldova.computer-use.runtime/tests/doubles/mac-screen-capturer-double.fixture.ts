/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IMacScreenCapturer } from "@noldova/computer-use.runtime/macos";

export class MacScreenCapturerDouble implements IMacScreenCapturer {
  public error: Error | null = null;
  public png: Uint8Array = new Uint8Array(0);
  public readonly windows: string[] = [];

  public async captureWindowAsync(windowId: string, _signal: AbortSignal): Promise<Uint8Array> {
    this.windows.push(windowId);
    if (this.error !== null)
      throw this.error;

    return this.png;
  }
}
