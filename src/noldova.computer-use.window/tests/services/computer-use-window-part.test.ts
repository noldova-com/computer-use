/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@angular/compiler";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState, ControlStateUnknownException, SessionStatus, StatusReadRequest, StopRequest } from "@noldova/computer-use.protocol";
import type { JsonValue } from "@noldova/computer-use.protocol";
import { ComputerUseWindowPart } from "@noldova/computer-use.window";
import { StatusBarSide } from "@noldova/desktop.window";

import { WindowPartHarness } from "../fixtures/window-part-harness.fixture.ts";

class ActivePart {
  public readonly harness: WindowPartHarness;
  public readonly part: ComputerUseWindowPart;

  public constructor(harness: WindowPartHarness, part: ComputerUseWindowPart) {
    this.harness = harness;
    this.part = part;
  }
}

class StopFailedForTest extends Error {
}

function statusOf(state: ControlState): JsonValue {
  return new SessionStatus(state, state === ControlState.Controlling ? "session-1" : null).toJson();
}

async function activateAsync(state: ControlState): Promise<ActivePart> {
  const harness = new WindowPartHarness();
  const part = new ComputerUseWindowPart();
  harness.answer(StatusReadRequest.method, async () => statusOf(state));
  harness.answer(StopRequest.method, async () => null);
  await part.activateAsync(harness.context);

  return new ActivePart(harness, part);
}

describe("ComputerUseWindowPart", () => {
  it("adds a hidden status bar item on the right and a disabled stop command while no session controls the screen", async () => {
    const { harness } = await activateAsync(ControlState.Idle);

    assert.deepEqual([harness.item.side, harness.item.state().isHidden, harness.command.isEnabled(null)], [StatusBarSide.Right, true, false]);
    assert.deepEqual(harness.requests, [[StatusReadRequest.method, {}]]);
  });

  it("shows the item while a session controls the screen and hides it once control stops or ends", async () => {
    const { harness } = await activateAsync(ControlState.Idle);

    harness.context.raiseEvent(SessionStatus.changedEvent, statusOf(ControlState.Controlling));
    const shown = harness.item.state();
    const enabled = harness.command.isEnabled(null);
    harness.context.raiseEvent(SessionStatus.changedEvent, statusOf(ControlState.Stopped));
    const stopped = [harness.item.state().isHidden, harness.command.isEnabled(null)];
    harness.context.raiseEvent(SessionStatus.changedEvent, statusOf(ControlState.Controlling));
    harness.context.raiseEvent(SessionStatus.changedEvent, statusOf(ControlState.Idle));

    assert.deepEqual([shown.command, shown.isHidden, enabled], [harness.command.name, false, true]);
    assert.deepEqual(stopped, [true, false]);
    assert.deepEqual([harness.item.state().isHidden, harness.command.isEnabled(null)], [true, false]);
  });

  it("shows the item when the window opens while a session controls the screen", async () => {
    const { harness } = await activateAsync(ControlState.Controlling);

    assert.deepEqual([harness.item.state().isHidden, harness.command.isEnabled(null)], [false, true]);
  });

  it("keeps a change that arrives while the read waits over the read's answer", async () => {
    const harness = new WindowPartHarness();
    const { promise, resolve } = Promise.withResolvers<JsonValue>();
    harness.answer(StatusReadRequest.method, () => promise);
    const activation = new ComputerUseWindowPart().activateAsync(harness.context);

    harness.context.raiseEvent(SessionStatus.changedEvent, statusOf(ControlState.Stopped));
    resolve(statusOf(ControlState.Controlling));
    await activation;

    assert.equal(harness.item.state().isHidden, true);
  });

  it("stops control through the runtime part when the stop command runs", async () => {
    const { harness } = await activateAsync(ControlState.Controlling);

    const result = await harness.command.runAsync(null);

    assert.equal(result, null);
    assert.deepEqual(harness.requests.at(-1), [StopRequest.method, {}]);
  });

  it("passes a failed stop request to the command's caller and leaves the item as it was", async () => {
    const { harness } = await activateAsync(ControlState.Controlling);
    const failure = new StopFailedForTest();
    harness.answer(StopRequest.method, () => Promise.reject(failure));

    await assert.rejects(harness.command.runAsync(null), t => t === failure);

    assert.deepEqual([harness.item.state().isHidden, harness.command.isEnabled(null)], [false, true]);
  });

  it("refuses a status event that isn't a session status, out of the event's dispatch, and leaves the item as it was", async () => {
    const { harness } = await activateAsync(ControlState.Controlling);

    assert.throws(() => harness.context.raiseEvent(SessionStatus.changedEvent, { state: "Paused", sessionId: null }), ControlStateUnknownException);

    assert.deepEqual([harness.item.state().isHidden, harness.command.isEnabled(null)], [false, true]);
  });

  it("reads the status again on reconnect, and reports false while not active", async () => {
    const part = new ComputerUseWindowPart();
    const inactive = await part.reconnectAsync();
    const harness = new WindowPartHarness();
    harness.answer(StatusReadRequest.method, async () => statusOf(ControlState.Idle));
    await part.activateAsync(harness.context);
    harness.answer(StatusReadRequest.method, async () => statusOf(ControlState.Controlling));

    const reconnected = await part.reconnectAsync();

    assert.deepEqual([inactive, reconnected, harness.item.state().isHidden], [false, true, false]);
    assert.deepEqual(harness.requests.map(t => t[0]), [StatusReadRequest.method, StatusReadRequest.method]);
  });

  it("stops listening and hides the item on deactivation", async () => {
    const { harness, part } = await activateAsync(ControlState.Controlling);

    await part.deactivateAsync();
    harness.context.raiseEvent(SessionStatus.changedEvent, statusOf(ControlState.Controlling));

    assert.deepEqual([harness.listenerCount, harness.item.state().isHidden, harness.command.isEnabled(null), await part.reconnectAsync()],
      [0, true, false, false]);
  });

  it("does nothing on deactivation before activation", async () => {
    const part = new ComputerUseWindowPart();

    await part.deactivateAsync();

    assert.equal(await part.reconnectAsync(), false);
  });

  it("refuses a read answer that isn't a session status", async () => {
    const harness = new WindowPartHarness();
    harness.answer(StatusReadRequest.method, async () => ({ state: "Paused", sessionId: null }));

    await assert.rejects(new ComputerUseWindowPart().activateAsync(harness.context), ControlStateUnknownException);
  });
});
