/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlInfo, ControlRole, ControlTree, DesktopRect } from "@noldova/computer-use.runtime";

import { WindowReadHarness } from "../services/window-read-harness.fixture.ts";

describe("an image rectangle", () => {
  it("gives a listed control's bounds in the screenshot's pixels, as its left and top edges, width and height", async () => {
    const harness = await WindowReadHarness.readyAsync();
    harness.backend.controls.set(null, new ControlTree([
      new ControlInfo("o", null, WindowReadHarness.notes, ControlRole.Button, "Open", null, [], new DesktopRect(4, 1, 2, 1))
    ], 0, false));

    const { text } = WindowReadHarness.readOf(await harness.callAsync("computer_read_window", {}));

    assert.equal(text, "- button \"Open\" at 4,1 2x1 [c1]");
  });
});
