/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { AppIdentity } from "./app-identity.ts";

export class InputTarget {
  public readonly app: AppIdentity;
  public readonly processId: number;
  public readonly windowId: string;

  public constructor(app: AppIdentity, windowId: string, processId: number) {
    if (!Resources.windowIdPattern.test(windowId))
      throw new ArgumentOutOfRangeException(Resources.windowIdParameterName, windowId, Resources.formatInvalidWindowId(windowId));
    if (!Number.isSafeInteger(processId) || processId <= 0)
      throw new ArgumentOutOfRangeException(Resources.processIdParameterName, processId, Resources.formatInvalidProcessId(processId));

    this.app = app;
    this.processId = processId;
    this.windowId = windowId;
  }
}
