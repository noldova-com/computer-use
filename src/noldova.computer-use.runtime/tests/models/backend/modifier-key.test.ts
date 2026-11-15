/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ModifierKey } from "@noldova/computer-use.runtime";

describe("ModifierKey", () => {
  it("has the shift, control, alt and meta keys", () => {
    assert.deepEqual([ModifierKey.Shift, ModifierKey.Control, ModifierKey.Alt, ModifierKey.Meta].map(t => t.value), ["Shift", "Control", "Alt", "Meta"]);
  });
});
