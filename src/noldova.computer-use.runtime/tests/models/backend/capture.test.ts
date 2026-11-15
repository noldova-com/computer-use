/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Capture, DesktopPoint, DesktopRect } from "@noldova/computer-use.runtime";
import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("Capture", () => {
  const pixels = (width: number, height: number): Uint8Array => new Uint8Array(width * height * 4);

  it("holds the display, its frame and scale, and the image", () => {
    const frame = new DesktopRect(-1920, 0, 1920, 1080);
    const bgra = pixels(1920, 1080);
    const capture = new Capture("display-2", frame, 1.5, 1920, 1080, bgra);

    assert.equal(capture.displayId, "display-2");
    assert.equal(capture.frame, frame);
    assert.equal(capture.scaleFactor, 1.5);
    assert.equal(capture.width, 1920);
    assert.equal(capture.height, 1080);
    assert.equal(capture.bgra, bgra);
  });

  it("maps an image pixel one to one when the image matches the frame", () => {
    const capture = new Capture("d", new DesktopRect(-1920, -120, 1920, 1080), 1, 1920, 1080, pixels(1920, 1080));

    assert.deepEqual(capture.toDesktopPoint(0, 0), new DesktopPoint(-1920, -120));
    assert.deepEqual(capture.toDesktopPoint(1919, 1079), new DesktopPoint(-1, 959));
  });

  it("maps an image pixel to the centre of the desktop area it shows when the image is scaled", () => {
    const retina = new Capture("d", new DesktopRect(0, 0, 1440, 900), 2, 2880, 1800, pixels(2880, 1800));
    const halved = new Capture("d", new DesktopRect(100, 0, 2560, 1440), 1, 1280, 720, pixels(1280, 720));

    assert.deepEqual(retina.toDesktopPoint(1, 1), new DesktopPoint(0, 0));
    assert.deepEqual(retina.toDesktopPoint(2879, 1799), new DesktopPoint(1439, 899));
    assert.deepEqual(halved.toDesktopPoint(0, 0), new DesktopPoint(101, 1));
    assert.deepEqual(halved.toDesktopPoint(1279, 719), new DesktopPoint(2659, 1439));
  });

  for (const [x, y, parameter] of [[-1, 0, "imageX"], [0, -1, "imageY"], [4, 0, "imageX"], [0, 3, "imageY"], [0.5, 0, "imageX"], [0, 0.5, "imageY"]] as const)
    it(`refuses the image point ${x}, ${y} outside a 4 by 3 capture`, () => {
      const capture = new Capture("d", new DesktopRect(0, 0, 4, 3), 1, 4, 3, pixels(4, 3));

      assert.throws(() => capture.toDesktopPoint(x, y), ArgumentOutOfRangeException);
      assert.throws(() => capture.toDesktopPoint(x, y), { name: "ArgumentOutOfRangeException", message: `The image point ${x}, ${y} lies outside the 4 by 3 capture. (Parameter '${parameter}')` });
    });

  it("refuses a capture without a display, scale or size, or whose pixels don't match its size", () => {
    const frame = new DesktopRect(0, 0, 4, 3);

    assert.throws(() => new Capture("", frame, 1, 4, 3, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("", frame, 1, 4, 3, pixels(4, 3)), { name: "ArgumentOutOfRangeException", message: "A display ID must not be empty. (Parameter 'displayId')" });
    assert.throws(() => new Capture("d", frame, 0, 4, 3, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("d", frame, 0, 4, 3, pixels(4, 3)), { name: "ArgumentOutOfRangeException", message: "Display d's scale factor must be a finite number above zero. (Parameter 'scaleFactor')" });
    assert.throws(() => new Capture("d", frame, Number.NaN, 4, 3, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("d", frame, 1, 0, 3, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("d", frame, 1, 0, 3, pixels(4, 3)), { name: "ArgumentOutOfRangeException", message: "The capture of display d must be whole pixels above zero, not 0 by 3. (Parameter 'width')" });
    assert.throws(() => new Capture("d", frame, 1, 4, 0.5, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("d", frame, 1, 4, 0.5, pixels(4, 3)), { name: "ArgumentOutOfRangeException", parameterName: "height" });
    assert.throws(() => new Capture("d", frame, 1, 4.5, 3, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("d", frame, 1, 4.5, 3, pixels(4, 3)), { name: "ArgumentOutOfRangeException", parameterName: "width" });
    assert.throws(() => new Capture("d", frame, 1, 4, -3, pixels(4, 3)), ArgumentOutOfRangeException);
    assert.throws(() => new Capture("d", frame, 1, 4, -3, pixels(4, 3)), { name: "ArgumentOutOfRangeException", parameterName: "height" });
    assert.throws(() => new Capture("d", frame, 1, 4, 3, new Uint8Array(47)), ArgumentException);
    assert.throws(() => new Capture("d", frame, 1, 4, 3, new Uint8Array(47)), { name: "ArgumentException", message: "The capture of display d holds 47 bytes, not 4 for each of its 4 by 3 pixels. (Parameter 'bgra')" });
  });
});
