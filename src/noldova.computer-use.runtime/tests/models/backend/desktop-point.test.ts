/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopPoint } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("DesktopPoint", () => {
  it("holds whole coordinates, negative ones included", () => {
    const point = new DesktopPoint(-1920, 40);

    assert.equal(point.x, -1920);
    assert.equal(point.y, 40);
  });

  for (const [x, y] of [[0.5, 0], [0, 0.5], [Number.NaN, 0], [0, Number.POSITIVE_INFINITY]] as const)
    it(`refuses the point ${x}, ${y}`, () => {
      assert.throws(() => new DesktopPoint(x, y), ArgumentOutOfRangeException);
      assert.throws(() => new DesktopPoint(x, y), { name: "ArgumentOutOfRangeException", message: `The point ${x}, ${y} must be whole desktop units. (Parameter '${Number.isSafeInteger(x) ? "y" : "x"}')` });
    });
});
