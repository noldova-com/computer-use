/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { WindowsTestWindow } from "../../src/noldova.computer-use.runtime/tests/native/windows-test-window.fixture.ts";

import type { ITestWindow } from "./i-test-window.ts";

export class WindowsTestWindowHost implements ITestWindow {
  private static readonly PROGRAM: string = "\\powershell.exe";

  private readonly window: WindowsTestWindow;
  private readonly limitMs: number;

  private constructor(window: WindowsTestWindow, limitMs: number) {
    this.window = window;
    this.limitMs = limitMs;
  }

  public static async openAsync(limitMs: number): Promise<WindowsTestWindowHost> {
    const { WindowsTestWindow: Window } = await import("../../src/noldova.computer-use.runtime/tests/native/windows-test-window.fixture.ts");
    const window = new Window();
    try {
      await window.takeLineAsync("ready ", limitMs);
    }
    catch (error) {
      await window.closeAsync(limitMs);
      throw error;
    }
    return new WindowsTestWindowHost(window, limitMs);
  }

  public isTestWindowApp(identity: string): boolean {
    return identity.toLowerCase().endsWith(WindowsTestWindowHost.PROGRAM);
  }

  public async bringToFrontAsync(): Promise<void> {
  }

  public async waitForSaveAsync(): Promise<void> {
    await this.window.takeLineAsync("pressed save", this.limitMs);
  }

  public async closeAsync(): Promise<void> {
    await this.window.closeAsync(this.limitMs);
  }
}
