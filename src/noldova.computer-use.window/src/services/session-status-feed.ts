/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SessionStatus } from "@noldova/computer-use.protocol";
import type { IWindowPartContext } from "@noldova/desktop.window";

import { ControlStatus } from "../models/control-status.ts";

export class SessionStatusFeed {
  private readonly context: IWindowPartContext;

  public constructor(context: IWindowPartContext) {
    this.context = context;
  }

  public subscribe(listener: (status: ControlStatus) => void): () => void {
    return this.context.onEvent(SessionStatus.changedEvent, t => listener(new ControlStatus(SessionStatus.fromJson(t))));
  }
}
