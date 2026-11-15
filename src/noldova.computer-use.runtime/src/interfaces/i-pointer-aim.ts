/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AimedPoint } from "../models/aimed-point.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import type { ScreenPoints } from "../services/screen-points.ts";
import type { IToolCallContext } from "./i-tool-call-context.ts";

export interface IPointerAim {
  locateAsync(points: ScreenPoints, window: WindowInfo, context: IToolCallContext): Promise<AimedPoint>;
}
