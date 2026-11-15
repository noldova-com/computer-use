/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PhysicalInputKind } from "@noldova/computer-use.runtime";

describe("PhysicalInputKind", () => {
  it("has the pointer and the keyboard", () => {
    assert.deepEqual([PhysicalInputKind.Pointer, PhysicalInputKind.Keyboard].map(t => t.value), ["Pointer", "Keyboard"]);
  });
});
