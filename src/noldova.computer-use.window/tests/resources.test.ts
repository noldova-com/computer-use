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

import { ControlState, SessionStatus, StatusReadRequest } from "@noldova/computer-use.protocol";
import { ComputerUseWindowPart } from "@noldova/computer-use.window";

import { WindowPartHarness } from "./fixtures/window-part-harness.fixture.ts";

describe("Resources", () => {
  it("names its module", () => {
    assert.equal(new ComputerUseWindowPart().moduleId, "computer-use");
  });

  it("names the status item and the stop command, with their texts and glyph", async () => {
    const harness = new WindowPartHarness();
    harness.answer(StatusReadRequest.method, async () => new SessionStatus(ControlState.Controlling, "session-1").toJson());
    await new ComputerUseWindowPart().activateAsync(harness.context);
    const state = harness.item.state();
    const command = harness.command;

    assert.deepEqual([harness.item.name, state.text, state.icon, state.tooltip, state.command],
      ["computer-use.status", "Controlling the screen", "arrow_selector_tool", "Stop computer use", "computer-use.stopControl"]);
    assert.deepEqual([command.name, command.title, command.icon], ["computer-use.stopControl", "Stop computer use", "arrow_selector_tool"]);
  });
});
