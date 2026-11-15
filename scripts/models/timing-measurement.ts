/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class TimingMeasurement {
  public readonly measuredMs: number;
  public readonly limitMs: number;

  public constructor(measuredMs: number, limitMs: number) {
    this.measuredMs = measuredMs;
    this.limitMs = limitMs;
  }

  public static parseOrNull(message: string): TimingMeasurement | null {
    const [, measured, limit] = Resources.timingDiagnosticPattern.exec(message) ?? [];

    return measured === undefined || limit === undefined ? null : new TimingMeasurement(Number(measured), Number(limit));
  }
}
