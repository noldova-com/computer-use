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

import { ControlState, SessionStatus } from "@noldova/computer-use.protocol";

import { WindowPartHarness } from "../fixtures/window-part-harness.fixture.ts";

describe("ControlStatus", () => {
  it("offers the stop control while a session controls the screen", async () => {
    const harness = new WindowPartHarness();
    await harness.activateAsync(ControlState.Idle);

    harness.context.raiseEvent(SessionStatus.changedEvent, new SessionStatus(ControlState.Controlling, "session-1").toJson());

    assert.deepEqual([harness.item.state().isHidden, harness.command.isEnabled(null)], [false, true]);
  });

  for (const state of [ControlState.Idle, ControlState.Stopped])
    it(`doesn't offer the stop control when the state is ${state.value}`, async () => {
      const harness = new WindowPartHarness();
      await harness.activateAsync(ControlState.Controlling);

      harness.context.raiseEvent(SessionStatus.changedEvent, new SessionStatus(state, null).toJson());

      assert.deepEqual([harness.item.state().isHidden, harness.command.isEnabled(null)], [true, false]);
    });
});
