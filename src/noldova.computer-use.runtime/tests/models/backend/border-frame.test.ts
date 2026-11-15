/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BorderFrame, DesktopRect, Display } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("BorderFrame", () => {
  it("holds the display's bounds and the border's thickness", () => {
    const frame = new BorderFrame(new DesktopRect(-1920, 0, 1920, 1080), 4);

    assert.deepEqual([frame.bounds, frame.thickness], [new DesktopRect(-1920, 0, 1920, 1080), 4]);
  });

  for (const [units, thickness] of [[1, 4], [1.25, 5], [1.5, 6], [1.75, 7], [2, 8], [0.1, 1]] as const)
    it(`is 0.25rem wide, ${thickness} units at ${units} units for a CSS pixel`, () => {
      assert.equal(BorderFrame.of(new Display("1", 0, 0, 1920, 1080, units, true), units).thickness, thickness);
    });

  it("lies along the display's bounds", () => {
    assert.deepEqual(BorderFrame.of(new Display("2", -1280, 200, 1280, 1024, 1, false), 1).bounds, new DesktopRect(-1280, 200, 1280, 1024));
  });

  it("names the thickness it refuses", () => {
    assert.throws(() => new BorderFrame(new DesktopRect(0, 0, 8, 8), 5), ArgumentOutOfRangeException);
    assert.throws(() => new BorderFrame(new DesktopRect(0, 0, 8, 8), 5), {
      name: "ArgumentOutOfRangeException",
      message: "A border's thickness of 5 must be whole desktop units above zero, and fit twice into its display. (Parameter 'thickness')"
    });
  });

  for (const thickness of [0, -1, 1.5, Number.NaN, 5])
    it(`refuses a thickness of ${thickness} on a display of 8 by 10`, () => {
      assert.throws(() => new BorderFrame(new DesktopRect(0, 0, 8, 10), thickness), ArgumentOutOfRangeException);
    });

  it("takes a thickness that fits exactly twice", () => {
    assert.equal(new BorderFrame(new DesktopRect(0, 0, 8, 10), 4).thickness, 4);
  });
});
