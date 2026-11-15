/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Display, IDisplayBackend } from "@noldova/computer-use.runtime";

export class DisplayBackendDouble implements IDisplayBackend {
  public displays: readonly Display[];
  public failure: unknown;

  public readonly signals: AbortSignal[] = [];

  public constructor(displays: readonly Display[], failure?: unknown) {
    this.displays = displays;
    this.failure = failure;
  }

  public async listDisplaysAsync(signal: AbortSignal): Promise<readonly Display[]> {
    this.signals.push(signal);
    if (this.failure !== undefined)
      throw this.failure;

    return this.displays;
  }
}
