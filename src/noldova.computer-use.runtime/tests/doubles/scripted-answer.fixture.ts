/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ScriptedAnswer {
  private readonly answer: (parameters: ReadonlyMap<string, unknown>) => unknown;

  private constructor(answer: (parameters: ReadonlyMap<string, unknown>) => unknown) {
    this.answer = answer;
  }

  public static of(value: unknown): ScriptedAnswer {
    return new ScriptedAnswer(() => value);
  }

  public static by(answer: (parameters: ReadonlyMap<string, unknown>) => unknown): ScriptedAnswer {
    return new ScriptedAnswer(answer);
  }

  public async answerAsync(parameters: object): Promise<unknown> {
    return await this.answer(new Map<string, unknown>(Object.entries(parameters)));
  }
}
