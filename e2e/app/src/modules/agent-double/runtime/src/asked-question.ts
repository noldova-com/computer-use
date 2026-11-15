/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";
import type { PermissionDecision, PermissionQuestion } from "@noldova/desktop.runtime";

export class AskedQuestion {
  public readonly question: PermissionQuestion;
  public readonly decision: PermissionDecision;

  public constructor(question: PermissionQuestion, decision: PermissionDecision) {
    this.question = question;
    this.decision = decision;
  }

  public toJson(): JsonObject {
    const request = this.question.request;
    return {
      id: this.question.id,
      module: this.question.module,
      scope: this.question.scope,
      action: request.action,
      subject: request.subject ?? null,
      title: request.title,
      risk: request.risk,
      options: [...request.options],
      decision: this.decision
    };
  }
}
