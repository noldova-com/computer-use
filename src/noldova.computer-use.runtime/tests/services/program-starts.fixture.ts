/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { OwnedProcess, ProcessRequest } from "@noldova/desktop.runtime";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";

export class ProgramStarts extends ProgramStarterDouble {
  private readonly startWaiters: ((program: OwnedProcess) => void)[] = [];

  public override async startProcessAsync(request: ProcessRequest): Promise<OwnedProcess> {
    const program = await super.startProcessAsync(request);
    for (const resolve of this.startWaiters.splice(0))
      resolve(program);

    return program;
  }

  public nextStartAsync(): Promise<OwnedProcess> {
    return new Promise(resolve => this.startWaiters.push(resolve));
  }
}
