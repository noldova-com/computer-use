/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { ControlInfo } from "./control-info.ts";

export class ControlTree {
  public readonly controls: readonly ControlInfo[];
  public readonly isTimedOut: boolean;
  public readonly leftOut: number;

  public constructor(controls: readonly ControlInfo[], leftOut: number, isTimedOut: boolean) {
    if (!Number.isSafeInteger(leftOut) || leftOut < 0)
      throw new ArgumentOutOfRangeException(Resources.leftOutParameterName, leftOut, Resources.formatInvalidControlsLeftOut(leftOut));
    const handles = new Set<string>();
    for (const control of controls) {
      if (handles.has(control.handle))
        throw new ArgumentException(Resources.formatRepeatedControlHandle(control.handle), Resources.controlsParameterName);
      if (control.parentHandle !== null && !handles.has(control.parentHandle))
        throw new ArgumentException(Resources.formatControlBeforeParent(control.handle), Resources.controlsParameterName);
      handles.add(control.handle);
    }

    this.controls = controls;
    this.isTimedOut = isTimedOut;
    this.leftOut = leftOut;
  }
}
