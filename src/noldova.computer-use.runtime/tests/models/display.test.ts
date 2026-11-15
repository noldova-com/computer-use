/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  Display,
  DisplayIdEmptyException,
  DisplayOriginInvalidException,
  DisplayScaleInvalidException,
  DisplaySizeInvalidException
} from "@noldova/computer-use.runtime";

describe("Display", () => {
  it("gives its wire form", () => {
    const display = new Display("display-2", -1920, -120, 1920, 1080, 1.5, false);

    assert.deepEqual(display.toJson(), { id: "display-2", x: -1920, y: -120, width: 1920, height: 1080, scaleFactor: 1.5, isPrimary: false });
  });

  it("refuses an empty ID", () => {
    assert.throws(() => new Display("", 0, 0, 1, 1, 1, true), DisplayIdEmptyException);
  });

  for (const [x, y] of [[0.5, 0], [0, 0.5]] as const)
    it(`refuses the position ${x}, ${y}`, () => {
      assert.throws(() => new Display("d", x, y, 1, 1, 1, true), DisplayOriginInvalidException);
    });

  for (const [width, height] of [[0, 1], [1.5, 1], [1, 0], [1, 1.5]] as const)
    it(`refuses the size ${width} by ${height}`, () => {
      assert.throws(() => new Display("d", 0, 0, width, height, 1, true), DisplaySizeInvalidException);
    });

  for (const scaleFactor of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
    it(`refuses the scale factor ${scaleFactor}`, () => {
      assert.throws(() => new Display("d", 0, 0, 1, 1, scaleFactor, true), DisplayScaleInvalidException);
    });
});
