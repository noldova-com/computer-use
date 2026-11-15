/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class Resources {
  public static readonly callToolMethod: string = "agent-double.callTool";
  public static readonly listToolsMethod: string = "agent-double.listTools";
  public static readonly planAnswerMethod: string = "agent-double.planAnswer";
  public static readonly takeQuestionsMethod: string = "agent-double.takeQuestions";
  public static readonly endSessionMethod: string = "agent-double.endSession";
  public static readonly sessionScope: string = "agent-double.conversation";
  public static readonly nameField: string = "name";
  public static readonly inputField: string = "input";
  public static readonly actionField: string = "action";
  public static readonly answerField: string = "answer";
  public static readonly allowAlwaysAnswer: string = "allowAlways";
  public static readonly allowOnceAnswer: string = "allowOnce";
  public static readonly denyAnswer: string = "deny";

  public static formatUnknownAnswer(answer: string): string {
    return `The agent double plans no answer called ${JSON.stringify(answer)}; it takes allowAlways, allowOnce or deny.`;
  }
}
