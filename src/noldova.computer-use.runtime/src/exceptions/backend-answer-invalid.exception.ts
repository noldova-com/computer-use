/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ArgumentException, ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class BackendAnswerInvalidException extends BackendValueException {
  public readonly answer: string;
  public readonly value: unknown;

  public constructor(answer: string, value: unknown, cause: ArgumentException) {
    super(Resources.formatBackendAnswerInvalid(answer, cause.message), new ExceptionOptions(cause));

    this.answer = answer;
    this.value = value;
  }
}
