/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MacTestWindow } from "../../src/noldova.computer-use.runtime/tests/native/mac-test-window.fixture.ts";

import type { ITestWindow } from "./i-test-window.ts";

export class MacTestWindowHost implements ITestWindow {
  private readonly window: MacTestWindow;
  private readonly limitMs: number;

  private constructor(window: MacTestWindow, limitMs: number) {
    this.window = window;
    this.limitMs = limitMs;
  }

  public static async openAsync(limitMs: number): Promise<MacTestWindowHost> {
    const window = await MacTestWindow.openAsync();
    try {
      await window.takeLineAsync("ready ", limitMs);
    }
    catch (error) {
      await window.closeAsync(limitMs);
      throw error;
    }
    return new MacTestWindowHost(window, limitMs);
  }

  public isTestWindowApp(identity: string): boolean {
    return identity === this.window.bundleId;
  }

  public async bringToFrontAsync(): Promise<void> {
    await this.window.bringToFrontAsync(this.limitMs);
  }

  public async waitForSaveAsync(): Promise<void> {
    await this.window.takeLineAsync("pressed save", this.limitMs);
  }

  public async closeAsync(): Promise<void> {
    await this.window.closeAsync(this.limitMs);
  }
}
