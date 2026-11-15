/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonReader, type JsonValue } from "@noldova/context.json";
import type { IRuntimePart, IRuntimePartContext, IToolsContext, Registration, RequestContext, ToolSession } from "@noldova/desktop.runtime";

import { PlannedAnswers } from "./planned-answers.js";
import { Resources } from "./resources.js";

export class RuntimePart implements IRuntimePart {
  private readonly answers: PlannedAnswers = new PlannedAnswers();
  private answerer: Registration | null = null;
  private session: ToolSession | null = null;

  public async activateAsync(context: IRuntimePartContext): Promise<void> {
    this.answerer = context.permissions.registerAnswerer(this.answers);
    context.registerMethod(Resources.callToolMethod, { handleAsync: t => this.callToolAsync(context.tools, t) });
    context.registerMethod(Resources.listToolsMethod, { handleAsync: async () => this.openSession(context.tools).listTools().map(t => t.name) });
    context.registerMethod(Resources.planAnswerMethod, { handleAsync: async t => this.planAnswer(t) });
    context.registerMethod(Resources.takeQuestionsMethod, { handleAsync: async () => this.answers.takeAsked().map(t => t.toJson()) });
    context.registerMethod(Resources.endSessionMethod, { handleAsync: async () => this.endSession() });
  }

  public async deactivateAsync(): Promise<void> {
    this.endSession();
    this.answerer?.[Symbol.dispose]();
    this.answerer = null;
  }

  private async callToolAsync(tools: IToolsContext, request: RequestContext): Promise<JsonValue> {
    const payload = JsonReader.fromValue(request.payload);
    const result = await this.openSession(tools).callAsync(payload.readString(Resources.nameField), payload.readObject(Resources.inputField).toJson(), { signal: request.signal });
    return result.toJson();
  }

  private planAnswer(request: RequestContext): null {
    const payload = JsonReader.fromValue(request.payload);
    this.answers.plan(payload.readString(Resources.actionField), payload.readString(Resources.answerField));
    return null;
  }

  private endSession(): null {
    this.session?.end();
    this.session = null;
    return null;
  }

  private openSession(tools: IToolsContext): ToolSession {
    this.session ??= tools.openSession(Resources.sessionScope, {});
    return this.session;
  }
}
