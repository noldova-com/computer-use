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

import { ControlState, ControlStateUnknownException, SessionStatus } from "@noldova/computer-use.protocol";

import { WindowPartHarness } from "../fixtures/window-part-harness.fixture.ts";

describe("SessionStatusFeed", () => {
  it("gives the window each status the runtime part sends", async () => {
    const harness = new WindowPartHarness();
    await harness.activateAsync(ControlState.Idle);

    harness.context.raiseEvent(SessionStatus.changedEvent, new SessionStatus(ControlState.Controlling, "session-1").toJson());
    const controlling = harness.item.state().isHidden;
    harness.context.raiseEvent(SessionStatus.changedEvent, new SessionStatus(ControlState.Stopped, null).toJson());

    assert.deepEqual([controlling, harness.item.state().isHidden], [false, true]);
  });

  it("stops once the window part unsubscribes", async () => {
    const harness = new WindowPartHarness();
    const part = await harness.activateAsync(ControlState.Idle);

    await part.deactivateAsync();
    harness.context.raiseEvent(SessionStatus.changedEvent, new SessionStatus(ControlState.Controlling, "session-1").toJson());

    assert.deepEqual([harness.listenerCount, harness.item.state().isHidden], [0, true]);
  });

  it("refuses a payload that isn't a session status", async () => {
    const harness = new WindowPartHarness();
    await harness.activateAsync(ControlState.Idle);

    assert.throws(() => harness.context.raiseEvent(SessionStatus.changedEvent, { state: "Paused", sessionId: null }), ControlStateUnknownException);
    assert.equal(harness.item.state().isHidden, true);
  });
});
