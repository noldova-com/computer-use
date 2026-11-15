/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException } from "@noldova/context.exceptions";
import { type IPermissionAnswerer, PermissionDecision, PermissionOption, type PermissionQuestion } from "@noldova/desktop.runtime";

import { AskedQuestion } from "./asked-question.js";
import { Resources } from "./resources.js";

export class PlannedAnswers implements IPermissionAnswerer {
  private static readonly ANSWERS: readonly string[] = [Resources.allowAlwaysAnswer, Resources.allowOnceAnswer, Resources.denyAnswer];

  private readonly plans: Map<string, string[]> = new Map();
  private asked: AskedQuestion[] = [];

  public plan(action: string, answer: string): void {
    if (!PlannedAnswers.ANSWERS.includes(answer))
      throw new ArgumentException(Resources.formatUnknownAnswer(answer), Resources.answerField);
    this.plans.set(action, [...this.plans.get(action) ?? [], answer]);
  }

  public takeAsked(): readonly AskedQuestion[] {
    const asked = this.asked;
    this.asked = [];
    return asked;
  }

  public async answerAsync(question: PermissionQuestion, _signal: AbortSignal): Promise<PermissionDecision> {
    const planned = this.plans.get(question.request.action) ?? [];
    const answer = planned.shift() ?? Resources.denyAnswer;
    const decision = PlannedAnswers.decide(answer, question.request.options);
    this.asked.push(new AskedQuestion(question, decision));
    return decision;
  }

  private static decide(answer: string, options: readonly PermissionOption[]): PermissionDecision {
    if (answer === Resources.allowAlwaysAnswer && options.includes(PermissionOption.AllowAlways))
      return PermissionDecision.AllowedAlways;
    if (answer !== Resources.denyAnswer && options.includes(PermissionOption.AllowOnce))
      return PermissionDecision.AllowedOnce;
    return PermissionDecision.Denied;
  }
}
