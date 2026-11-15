/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";

export class Heartbeat {
  public readonly at: number;
  public readonly sequence: number;

  public constructor(sequence: number, at: number) {
    if (!Number.isSafeInteger(sequence) || sequence <= 0)
      throw new ArgumentOutOfRangeException(Resources.sequenceParameterName, sequence, Resources.formatInvalidHeartbeatSequence(sequence));
    if (!Number.isFinite(at) || at < 0)
      throw new ArgumentOutOfRangeException(Resources.atParameterName, at, Resources.formatInvalidTime(at));

    this.at = at;
    this.sequence = sequence;
  }
}
