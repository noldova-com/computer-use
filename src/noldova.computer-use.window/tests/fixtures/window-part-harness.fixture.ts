/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";

import { type ControlState, type JsonValue, SessionStatus, StatusReadRequest, StopRequest } from "@noldova/computer-use.protocol";
import { ComputerUseWindowPart } from "@noldova/computer-use.window";
import { CommandContribution, StatusBarItem, type StatusBarItemContribution, type StatusBarItemState } from "@noldova/desktop.window";
import { FakeWindowPartContext } from "@noldova/desktop.window/testing";

export class WindowPartHarness {
  public readonly context: FakeWindowPartContext = new FakeWindowPartContext();
  private readonly answers: Map<string, () => Promise<JsonValue>> = new Map();
  private readonly items: StatusBarItem[] = [];

  public constructor() {
    this.context.answer("registerStatusBarItem", t => this.addItem(t));
    this.context.answer("requestAsync", method => this.answerAsync(method));
  }

  public get command(): CommandContribution {
    const commands = this.context.callsOf("registerCommand").map(t => t[0]);
    assert.equal(commands.length, 1);
    const [command] = commands;
    if (!(command instanceof CommandContribution))
      throw new TypeError("The part registered a command that isn't a CommandContribution.");

    return command;
  }

  public get item(): StatusBarItem {
    assert.equal(this.items.length, 1);
    const [item] = this.items;
    if (item === undefined)
      throw new TypeError("The part registered no status bar item.");

    return item;
  }

  public get listenerCount(): number {
    return this.context.activeCallsOf("onEvent").length;
  }

  public get requests(): readonly (readonly unknown[])[] {
    return this.context.callsOf("requestAsync");
  }

  public async activateAsync(state: ControlState): Promise<ComputerUseWindowPart> {
    const part = new ComputerUseWindowPart();
    this.answer(StatusReadRequest.method, async () => new SessionStatus(state, state.isControlling ? "session-1" : null).toJson());
    this.answer(StopRequest.method, async () => null);
    await part.activateAsync(this.context);

    return part;
  }

  public answer(method: string, answer: () => Promise<JsonValue>): void {
    this.answers.set(method, answer);
  }

  private addItem(contribution: StatusBarItemContribution): StatusBarItem {
    const item = new StatusBarItem(contribution, t => this.checkCommand(t));
    this.items.push(item);

    return item;
  }

  private async answerAsync(method: string): Promise<JsonValue> {
    const answer = this.answers.get(method);
    if (answer === undefined)
      throw new TypeError(`The test gave no answer to ${method}.`);

    return await answer();
  }

  private checkCommand(state: StatusBarItemState): void {
    if (state.command !== null && !state.command.startsWith("computer-use."))
      throw new TypeError(`The item's command ${state.command} isn't the module's own.`);
  }
}
