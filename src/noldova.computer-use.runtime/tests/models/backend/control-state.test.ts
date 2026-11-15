/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState } from "@noldova/computer-use.runtime";

describe("ControlState", () => {
  it("has the states a read lists", () => {
    const states = [
      ControlState.Focused, ControlState.Disabled, ControlState.ReadOnly, ControlState.Checked, ControlState.Mixed, ControlState.Selected,
      ControlState.Expanded, ControlState.Collapsed, ControlState.Password
    ];

    assert.deepEqual(states.map(t => t.value), ["Focused", "Disabled", "ReadOnly", "Checked", "Mixed", "Selected", "Expanded", "Collapsed", "Password"]);
  });
});
