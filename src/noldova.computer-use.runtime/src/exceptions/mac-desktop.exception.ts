/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ExceptionOptions } from "@noldova/context.exceptions";

import { ComputerUseException } from "./computer-use.exception.ts";

export abstract class MacDesktopException extends ComputerUseException {
  protected constructor(message: string, options?: ExceptionOptions) {
    super(message, options);
  }
}
