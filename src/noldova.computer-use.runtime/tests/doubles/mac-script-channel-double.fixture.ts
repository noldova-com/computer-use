/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IMacScriptChannel, MacScriptFailedException } from "@noldova/computer-use.runtime/macos";

import { ScriptedAnswers } from "./scripted-answers.fixture.ts";

export class MacScriptChannelDouble implements IMacScriptChannel {
  public readonly answers: ScriptedAnswers = new ScriptedAnswers([
    ["checkGrants", { screenRecording: true, accessibility: true }],
    ["listDisplays", []],
    ["getForegroundWindow", null],
    ["listWindows", { isComplete: true, windows: [] }],
    ["readWindow", null],
    ["listApps", { host: "", running: [], installed: [] }],
    ["describeBundle", null],
    ["readPointer", { x: 0, y: 0 }],
    ["startWatch", null],
    ["pollWatch", { hasMoved: false }],
    ["stopWatch", null]
  ]);
  public readonly calls: { readonly method: string; readonly parameters: object }[] = [];
  public readonly failures: Set<string> = new Set();
  public closeCount: number = 0;
  public outcome: unknown = { status: "done" };

  public async callAsync(method: string, parameters: object): Promise<unknown> {
    this.calls.push({ method, parameters });
    if (this.failures.has(method))
      throw new MacScriptFailedException(method, `${method} failed`);
    const answer = this.answers.get(method);

    return answer === undefined ? this.outcome : await answer.answerAsync(parameters);
  }

  public async closeAsync(): Promise<void> {
    this.closeCount += 1;
  }

  public named(method: string): readonly object[] {
    return this.calls.filter(t => t.method === method).map(t => t.parameters);
  }
}
