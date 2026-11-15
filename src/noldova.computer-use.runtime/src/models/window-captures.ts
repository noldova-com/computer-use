/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { StackedWindow } from "./backend/stacked-window.ts";
import type { WindowImage } from "./backend/window-image.ts";
import type { WindowStack } from "./backend/window-stack.ts";

export class WindowCaptures {
  public readonly after: WindowStack;
  public readonly before: WindowStack;
  public readonly images: ReadonlyMap<StackedWindow, WindowImage>;

  public constructor(before: WindowStack, after: WindowStack, images: ReadonlyMap<StackedWindow, WindowImage>) {
    this.after = after;
    this.before = before;
    this.images = images;
  }
}
