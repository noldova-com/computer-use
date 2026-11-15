/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WindowImage } from "@noldova/computer-use.runtime";
import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("WindowImage", () => {
  it("holds the window's pixels and their size", () => {
    const bgra = new Uint8Array(3 * 2 * 4);
    const image = new WindowImage(3, 2, bgra);

    assert.deepEqual([image.width, image.height], [3, 2]);
    assert.equal(image.bgra, bgra);
    assert.equal(WindowImage.bytesPerPixel, 4);
  });

  for (const [width, height, parameter] of [[0, 1, "width"], [1, 0, "height"], [1.5, 1, "width"], [1, Number.NaN, "height"]] as const)
    it(`refuses a ${width} by ${height} image`, () => {
      assert.throws(() => new WindowImage(width, height, new Uint8Array(4)), ArgumentOutOfRangeException);
      assert.throws(() => new WindowImage(width, height, new Uint8Array(4)), { name: "ArgumentOutOfRangeException", message: `The window's image must be whole pixels above zero, not ${width} by ${height}. (Parameter '${parameter}')` });
    });

  it("refuses pixels that don't match the size", () => {
    assert.throws(() => new WindowImage(2, 1, new Uint8Array(4)), ArgumentException);
    assert.throws(() => new WindowImage(2, 1, new Uint8Array(4)), { name: "ArgumentException", message: "The window's image holds 4 bytes, not 4 for each of its 2 by 1 pixels. (Parameter 'bgra')" });
  });
});
