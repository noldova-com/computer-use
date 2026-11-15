/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../../resources.ts";
import { DesktopPoint } from "./desktop-point.ts";
import { GlideStep } from "./glide-step.ts";

export class GlidePath {
  public static readonly stepMs: number = Resources.glideStepMs;
  public static readonly maxDurationMs: number = Resources.maxGlideDurationMs;
  public readonly durationMs: number;
  public readonly steps: readonly GlideStep[];

  private constructor(steps: readonly GlideStep[]) {
    this.durationMs = steps.at(-1)?.atMs ?? 0;
    this.steps = steps;
  }

  public static between(from: DesktopPoint, to: DesktopPoint): GlidePath {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const durationMs = Math.min(GlidePath.maxDurationMs, Math.round(Resources.glideDurationScaleMs * Math.log2(1 + distance / Resources.glideDistanceScale)));
    const count = Math.ceil(durationMs / GlidePath.stepMs);
    const steps: GlideStep[] = [];
    let last = from;
    for (let index = 1; index <= count; index++) {
      const atMs = Math.min(index * GlidePath.stepMs, durationMs);
      const share = GlidePath.easeOut(atMs / durationMs);
      const point = new DesktopPoint(Math.round(from.x + (to.x - from.x) * share), Math.round(from.y + (to.y - from.y) * share));
      if (point.x === last.x && point.y === last.y)
        continue;

      steps.push(new GlideStep(point, atMs));
      last = point;
    }

    return new GlidePath(steps);
  }

  private static easeOut(time: number): number {
    return 1 - (1 - time) ** 3;
  }
}
