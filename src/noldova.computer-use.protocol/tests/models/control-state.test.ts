/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState, ControlStateUnknownException } from "@noldova/computer-use.protocol";

describe("ControlState", () => {
  it("reads each wire value to its one instance", () => {
    assert.equal(ControlState.fromJson("Idle"), ControlState.Idle);
    assert.equal(ControlState.fromJson("Controlling"), ControlState.Controlling);
    assert.equal(ControlState.fromJson("Stopped"), ControlState.Stopped);
  });

  it("writes its wire value", () => {
    assert.equal(ControlState.Idle.toJson(), "Idle");
    assert.equal(ControlState.Controlling.toJson(), "Controlling");
    assert.equal(ControlState.Stopped.toJson(), "Stopped");
  });

  it("is controlling only while a session controls the screen", () => {
    assert.equal(ControlState.Idle.isControlling, false);
    assert.equal(ControlState.Controlling.isControlling, true);
    assert.equal(ControlState.Stopped.isControlling, false);
  });

  it("refuses an unknown value, another casing and another type", () => {
    for (const value of ["Paused", "idle", 0, null])
      assert.throws(() => ControlState.fromJson(value), ControlStateUnknownException);
  });
});
