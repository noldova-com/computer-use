/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PointerButton } from "@noldova/computer-use.runtime";

describe("PointerButton", () => {
  it("has the left, right and middle buttons", () => {
    assert.deepEqual([PointerButton.Left, PointerButton.Right, PointerButton.Middle].map(t => t.value), ["Left", "Right", "Middle"]);
  });
});
