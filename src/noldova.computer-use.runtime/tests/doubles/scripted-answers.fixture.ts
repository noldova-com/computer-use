/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ScriptedAnswer } from "./scripted-answer.fixture.ts";

export class ScriptedAnswers {
  private readonly answers: Map<string, ScriptedAnswer>;

  public constructor(values: readonly (readonly [string, unknown])[]) {
    this.answers = new Map(values.map(([method, value]) => [method, ScriptedAnswer.of(value)]));
  }

  public set(method: string, value: unknown): void {
    this.answers.set(method, ScriptedAnswer.of(value));
  }

  public setBy(method: string, answer: (parameters: ReadonlyMap<string, unknown>) => unknown): void {
    this.answers.set(method, ScriptedAnswer.by(answer));
  }

  public get(method: string): ScriptedAnswer | undefined {
    return this.answers.get(method);
  }
}
