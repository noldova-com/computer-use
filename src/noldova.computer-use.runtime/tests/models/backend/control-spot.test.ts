/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlRole, ControlSpot, DesktopPoint } from "@noldova/computer-use.runtime";

describe("ControlSpot", () => {
  it("describes the control found again and the point an input on it goes to", () => {
    const point = new DesktopPoint(1140, 802);
    const spot = new ControlSpot(ControlRole.Button, "Save", false, true, point);

    assert.equal(spot.role, ControlRole.Button);
    assert.equal(spot.name, "Save");
    assert.equal(spot.isEnabled, false);
    assert.equal(spot.isOnScreen, true);
    assert.equal(spot.point, point);
  });
});
