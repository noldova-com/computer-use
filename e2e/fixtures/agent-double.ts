/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonReader, type JsonObject } from "@noldova/context.json";

import type { TestApp } from "./test-app.ts";

export class AgentDouble {
  public static readonly CONTROL_SCREEN: string = "computer-use.controlScreen";
  public static readonly CONTROL_APP: string = "computer-use.controlApp";
  public static readonly ALLOW_ALWAYS: string = "allowAlways";
  public static readonly ALLOW_ONCE: string = "allowOnce";

  private readonly app: TestApp;

  public constructor(app: TestApp) {
    this.app = app;
  }

  public async planAsync(action: string, answer: string): Promise<void> {
    await this.app.requestAsync("agent-double.planAnswer", { action, answer });
  }

  public async callAsync(name: string, input: JsonObject = {}): Promise<JsonReader> {
    return JsonReader.fromValue(await this.app.requestAsync("agent-double.callTool", { name, input }));
  }

  public async takeQuestionsAsync(): Promise<readonly JsonReader[]> {
    return JsonReader.fromValue({ questions: await this.app.requestAsync("agent-double.takeQuestions", null) }).readObjectArray("questions");
  }

  public async listToolsAsync(): Promise<readonly string[]> {
    return JsonReader.fromValue({ tools: await this.app.requestAsync("agent-double.listTools", null) }).readStringArray("tools");
  }

  public async endAsync(): Promise<void> {
    await this.app.requestAsync("agent-double.endSession", null);
  }

  public static textsOf(result: JsonReader): readonly string[] {
    return result.readObjectArray("content").filter(t => t.readString("kind") === "Text").map(t => t.readString("text"));
  }

  public static imagesOf(result: JsonReader, origin: string): readonly JsonReader[] {
    return result.readObjectArray("content").filter(t => t.readString("kind") === "Image" && t.readOptionalString("origin") === origin);
  }

  public static describe(result: JsonReader): string {
    return JSON.stringify(result.toJson(), (key, value: unknown) => key === "data" ? "…" : value);
  }
}
