/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { StopRequest } from "@noldova/computer-use.protocol";
import type { IWindowPartContext } from "@noldova/desktop.window";

export class StopControl {
  private readonly context: IWindowPartContext;

  public constructor(context: IWindowPartContext) {
    this.context = context;
  }

  public async stopAsync(): Promise<void> {
    await this.context.requestAsync(StopRequest.method, new StopRequest().toJson());
  }
}
