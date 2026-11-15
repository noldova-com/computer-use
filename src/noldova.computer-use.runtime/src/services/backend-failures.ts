/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ComputerUseException } from "../exceptions/computer-use.exception.ts";
import { Resources } from "../resources.ts";

export class BackendFailures {
  public static isBackendFailure(error: unknown): error is Error {
    return error instanceof ComputerUseException || BackendFailures.hasCode(error, Resources.windowsAddonErrorCode);
  }

  public static isSystemError(error: unknown): boolean {
    return error instanceof Error && "syscall" in error && typeof error.syscall === "string";
  }

  public static hasCode(error: unknown, code: string): boolean {
    return error instanceof Error && "code" in error && error.code === code;
  }
}
