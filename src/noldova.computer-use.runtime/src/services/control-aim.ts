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

export class ControlAim implements IPointerAim {
  private readonly id: string;

  public constructor(id: string) {
    this.id = id;
  }

  public async locateAsync(points: ScreenPoints, window: WindowInfo, context: IToolCallContext): Promise<AimedPoint> {
    return await points.controlAsync(this.id, window, context);
  }
}
