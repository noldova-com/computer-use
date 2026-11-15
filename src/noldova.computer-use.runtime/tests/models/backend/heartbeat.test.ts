/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Heartbeat } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("Heartbeat", () => {
  it("holds its sequence and time", () => {
    const heartbeat = new Heartbeat(3, 0);

    assert.equal(heartbeat.sequence, 3);
    assert.equal(heartbeat.at, 0);
  });

  for (const sequence of [0, -1, 1.5, Number.NaN])
    it(`refuses the sequence ${sequence}`, () => {
      assert.throws(() => new Heartbeat(sequence, 0), ArgumentOutOfRangeException);
      assert.throws(() => new Heartbeat(sequence, 0), { name: "ArgumentOutOfRangeException", message: `A heartbeat's sequence must be a whole number above zero, not ${sequence}. (Parameter 'sequence')` });
    });

  for (const at of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    it(`refuses the time ${at}`, () => {
      assert.throws(() => new Heartbeat(1, at), ArgumentOutOfRangeException);
      assert.throws(() => new Heartbeat(1, at), { parameterName: "at", message: `The time ${at} must be milliseconds since the Unix epoch. (Parameter 'at')` });
    });
});
