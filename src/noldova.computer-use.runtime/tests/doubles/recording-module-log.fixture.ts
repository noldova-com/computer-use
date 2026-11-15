/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

export class RecordingModuleLog extends FakeModuleLog {
  private readonly writeWaiters: ((message: string) => void)[] = [];
  public readonly messages: string[] = [];

  public constructor() {
    super();
    this.answer("write", t => this.record(t));
  }

  public nextWriteAsync(): Promise<string> {
    return new Promise(resolve => this.writeWaiters.push(resolve));
  }

  private record(message: string): void {
    this.messages.push(message);
    for (const resolve of this.writeWaiters.splice(0))
      resolve(message);
  }
}
