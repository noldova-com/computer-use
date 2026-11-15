/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopPoint, GlideStep } from "@noldova/computer-use.runtime";

describe("GlideStep", () => {
  it("holds the point a glide moves the pointer to and the time from the glide's start it gets there", () => {
    const point = new DesktopPoint(-16, 40);
    const step = new GlideStep(point, 32);

    assert.equal(step.point, point);
    assert.equal(step.atMs, 32);
  });
});
