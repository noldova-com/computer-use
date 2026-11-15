/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class VariableUnsetException extends ReleaseException {
  public readonly variable: string;

  public constructor(variable: string) {
    super(Resources.formatVariableUnset(variable));

    this.variable = variable;
  }
}
