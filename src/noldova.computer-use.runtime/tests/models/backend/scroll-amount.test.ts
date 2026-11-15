/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScrollAmount } from "@noldova/computer-use.runtime";
import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("ScrollAmount", () => {
  it("holds whole notches each way, up to the limit", () => {
    const amount = new ScrollAmount(-50, 3);

    assert.equal(amount.x, -50);
    assert.equal(amount.y, 3);
    assert.equal(ScrollAmount.maxNotches, 50);
    assert.equal(new ScrollAmount(0, 50).y, 50);
  });

  it("names the scroll it refuses", () => {
    assert.throws(() => new ScrollAmount(0, 0), ArgumentException);
    assert.throws(() => new ScrollAmount(0, 0), { name: "ArgumentException", message: "A scroll of 0, 0 notches must be whole notches, at most 50 each way, and not zero both ways." });
  });

  for (const [x, y] of [[51, 0], [0, -51], [0.5, 1], [1, Number.NaN]] as const)
    it(`refuses ${x}, ${y} notches`, () => {
      assert.throws(() => new ScrollAmount(x, y), ArgumentOutOfRangeException);
    });
});
