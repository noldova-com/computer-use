/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("DesktopRect", () => {
  it("holds its position and size", () => {
    const rect = new DesktopRect(-1920, -120, 1920, 1080);

    assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [-1920, -120, 1920, 1080]);
  });

  it("names the rectangle it refuses", () => {
    assert.throws(() => new DesktopRect(0, 0, 0, 1), ArgumentOutOfRangeException);
    assert.throws(() => new DesktopRect(0, 0, 0, 1), { name: "ArgumentOutOfRangeException", message: "The rectangle at 0, 0 of 0 by 1 must be whole desktop units, with a size above zero. (Parameter 'width')" });
  });

  for (const [x, y, width, height] of [[0.5, 0, 1, 1], [0, 0.5, 1, 1], [0, 0, 0, 1], [0, 0, 1.5, 1], [0, 0, 1, 0], [0, 0, 1, -1], [0, 0, 1, 1.5]] as const)
    it(`refuses ${x}, ${y} of ${width} by ${height}`, () => {
      assert.throws(() => new DesktopRect(x, y, width, height), ArgumentOutOfRangeException);
    });
});
