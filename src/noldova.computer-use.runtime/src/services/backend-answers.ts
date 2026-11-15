/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException } from "@noldova/context.exceptions";

import { BackendAnswerInvalidException } from "../exceptions/backend-answer-invalid.exception.ts";

export class BackendAnswers {
  public static read<T>(answer: string, value: unknown, build: () => T): T {
    try {
      return build();
    } catch (error) {
      if (!(error instanceof ArgumentException))
        throw error;

      throw new BackendAnswerInvalidException(answer, value, error);
    }
  }
}
