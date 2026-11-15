/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ITestWindow } from "./i-test-window.ts";
import { MacTestWindowHost } from "./mac-test-window-host.ts";
import { WindowsTestWindowHost } from "./windows-test-window-host.ts";

export class TestWindows {
  public static async openAsync(limitMs: number): Promise<ITestWindow> {
    if (process.platform === "win32")
      return await WindowsTestWindowHost.openAsync(limitMs);
    if (process.platform === "darwin")
      return await MacTestWindowHost.openAsync(limitMs);
    throw new Error(`The native test windows open on Windows and macOS, not on ${process.platform}.`);
  }
}
