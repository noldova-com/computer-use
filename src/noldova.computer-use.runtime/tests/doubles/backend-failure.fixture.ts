/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ComputerUseException } from "@noldova/computer-use.runtime";

export class BackendFailureException extends ComputerUseException {
  public readonly call: string;

  public constructor(call: string) {
    super(`The backend failed ${call}.`);

    this.call = call;
  }
}
