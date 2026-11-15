/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPointerAim } from "../interfaces/i-pointer-aim.ts";
import type { IToolCallContext } from "../interfaces/i-tool-call-context.ts";
import type { AimedPoint } from "../models/aimed-point.ts";
import type { WindowInfo } from "../models/backend/window-info.ts";
import type { ScreenPoints } from "./screen-points.ts";

export class PointerAim implements IPointerAim {
  public async locateAsync(points: ScreenPoints, _window: WindowInfo, context: IToolCallContext): Promise<AimedPoint> {
    return await points.pointerAsync(context);
  }
}
