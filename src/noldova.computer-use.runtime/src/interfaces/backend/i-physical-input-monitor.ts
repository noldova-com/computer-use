/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Heartbeat } from "../../models/backend/heartbeat.ts";
import type { PhysicalInput } from "../../models/backend/physical-input.ts";

export interface IPhysicalInputMonitor {
  readonly heartbeatIntervalMs: number;
  startAsync(signal: AbortSignal): Promise<void>;
  stopAsync(): Promise<void>;
  onPhysicalInput(listener: (input: PhysicalInput) => void): Disposable;
  onHeartbeat(listener: (heartbeat: Heartbeat) => void): Disposable;
}
