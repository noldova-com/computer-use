/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IWindowBackend, StackedWindow, type WindowInfo, WindowStack } from "@noldova/computer-use.runtime";

import { BackendFailureException } from "./backend-failure.fixture.ts";

export class WindowBackendDouble implements IWindowBackend {
  public foreground: WindowInfo | null;
  public readonly signals: AbortSignal[] = [];
  public stackListings: number = 0;
  public stacks: readonly WindowStack[] | null = null;

  public constructor(foreground: WindowInfo | null) {
    this.foreground = foreground;
  }

  public async getForegroundWindowAsync(signal: AbortSignal): Promise<WindowInfo | null> {
    this.signals.push(signal);

    return this.foreground;
  }

  public async listStackAsync(signal: AbortSignal): Promise<WindowStack> {
    this.signals.push(signal);
    const stacks = this.stacks ?? [this.frontStack()];
    const stack = stacks[Math.min(this.stackListings, stacks.length - 1)];
    this.stackListings += 1;
    if (stack === undefined)
      throw new BackendFailureException("listStack");

    return stack;
  }

  private frontStack(): WindowStack {
    const front = this.foreground;

    return new WindowStack(true, front === null ? [] : [new StackedWindow(front.app, front.target.windowId, front.frame)]);
  }
}
