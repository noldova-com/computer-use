/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { PhysicalInputKind } from "./physical-input-kind.ts";

export class PhysicalInput {
  public readonly at: number;
  public readonly kind: PhysicalInputKind;
  public readonly processId: number | null;

  public constructor(kind: PhysicalInputKind, at: number, processId: number | null) {
    if (!Number.isFinite(at) || at < 0)
      throw new ArgumentOutOfRangeException(Resources.atParameterName, at, Resources.formatInvalidTime(at));
    if (processId !== null && (!Number.isSafeInteger(processId) || processId <= 0))
      throw new ArgumentOutOfRangeException(Resources.processIdParameterName, processId, Resources.formatInvalidProcessId(processId));

    this.at = at;
    this.kind = kind;
    this.processId = processId;
  }
}
