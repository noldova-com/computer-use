/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { StackedWindow } from "./stacked-window.ts";

export class WindowStack {
  public readonly isComplete: boolean;
  public readonly windows: readonly StackedWindow[];

  public constructor(isComplete: boolean, windows: readonly StackedWindow[]) {
    this.isComplete = isComplete;
    this.windows = windows;
  }
}
