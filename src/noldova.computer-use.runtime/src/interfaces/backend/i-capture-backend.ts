/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CaptureLayout } from "../../models/backend/capture-layout.ts";
import type { StackedWindow } from "../../models/backend/stacked-window.ts";
import type { WindowImage } from "../../models/backend/window-image.ts";

export interface ICaptureBackend {
  measureDisplayAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout>;
  captureWindowAsync(window: StackedWindow, signal: AbortSignal): Promise<WindowImage | null>;
}
