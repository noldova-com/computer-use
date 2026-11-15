/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class ProgramPathInvalidException extends BackendValueException {
  public readonly programPath: string;

  public constructor(programPath: string) {
    super(Resources.formatInvalidWindowsProgramPath(programPath));

    this.programPath = programPath;
  }
}
