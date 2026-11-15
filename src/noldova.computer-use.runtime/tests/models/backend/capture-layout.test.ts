/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureLayout, DesktopRect } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("CaptureLayout", () => {
  it("holds the display, its frame and scale, and the capture's size in pixels", () => {
    const frame = new DesktopRect(0, 0, 1440, 900);
    const layout = new CaptureLayout("display-1", frame, 2, 2880, 1800);

    assert.equal(layout.displayId, "display-1");
    assert.equal(layout.frame, frame);
    assert.equal(layout.scaleFactor, 2);
    assert.deepEqual([layout.width, layout.height], [2880, 1800]);
  });

  it("refuses a layout without a display, scale or size", () => {
    const frame = new DesktopRect(0, 0, 4, 3);

    assert.throws(() => new CaptureLayout("", frame, 1, 4, 3), ArgumentOutOfRangeException);
    assert.throws(() => new CaptureLayout("", frame, 1, 4, 3), { name: "ArgumentOutOfRangeException", message: "A display ID must not be empty. (Parameter 'displayId')" });
    assert.throws(() => new CaptureLayout("d", frame, 0, 4, 3), ArgumentOutOfRangeException);
    assert.throws(() => new CaptureLayout("d", frame, 0, 4, 3), { name: "ArgumentOutOfRangeException", message: "Display d's scale factor must be a finite number above zero. (Parameter 'scaleFactor')" });
    assert.throws(() => new CaptureLayout("d", frame, Number.POSITIVE_INFINITY, 4, 3), ArgumentOutOfRangeException);
    assert.throws(() => new CaptureLayout("d", frame, 1, 0, 3), ArgumentOutOfRangeException);
    assert.throws(() => new CaptureLayout("d", frame, 1, 0, 3), { name: "ArgumentOutOfRangeException", message: "The capture of display d must be whole pixels above zero, not 0 by 3. (Parameter 'width')" });
    assert.throws(() => new CaptureLayout("d", frame, 1, 4, 1.5), ArgumentOutOfRangeException);
    assert.throws(() => new CaptureLayout("d", frame, 1, 4, 1.5), { name: "ArgumentOutOfRangeException", message: "The capture of display d must be whole pixels above zero, not 4 by 1.5. (Parameter 'height')" });
  });
});
