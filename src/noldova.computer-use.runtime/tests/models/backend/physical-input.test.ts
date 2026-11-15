/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PhysicalInput, PhysicalInputKind } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("PhysicalInput", () => {
  it("holds only its kind, time and the process the key went to", () => {
    const input = new PhysicalInput(PhysicalInputKind.Keyboard, 1_791_000_000_000, 42);

    assert.equal(input.kind, PhysicalInputKind.Keyboard);
    assert.equal(input.at, 1_791_000_000_000);
    assert.equal(input.processId, 42);
    assert.deepEqual(Object.keys(input).sort(), ["at", "kind", "processId"]);
  });

  it("holds no process when none is known", () => {
    assert.equal(new PhysicalInput(PhysicalInputKind.Pointer, 0, null).processId, null);
  });

  for (const at of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    it(`refuses the time ${at}`, () => {
      assert.throws(() => new PhysicalInput(PhysicalInputKind.Pointer, at, null), ArgumentOutOfRangeException);
      assert.throws(() => new PhysicalInput(PhysicalInputKind.Pointer, at, null), { message: `The time ${at} must be milliseconds since the Unix epoch. (Parameter 'at')` });
    });

  for (const processId of [0, -1, 1.5, Number.NaN])
    it(`refuses the process ID ${processId}`, () => {
      assert.throws(() => new PhysicalInput(PhysicalInputKind.Keyboard, 0, processId), ArgumentOutOfRangeException);
      assert.throws(() => new PhysicalInput(PhysicalInputKind.Keyboard, 0, processId), { message: `A process ID must be a whole number above zero, not ${processId}. (Parameter 'processId')` });
    });
});
