/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopPoint, DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";

import { ClickCalls } from "../services/click-calls.fixture.ts";
import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { ScreenImages } from "../services/screen-images.fixture.ts";

describe("a screenshot's frame", () => {
  it("maps the point through a display's own position and scale", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.foreground = new WindowInfo(RuntimeHarness.notes.identity, "Notes", "100", 42, new DesktopRect(-8, 0, 16, 6), false);
    await harness.callAsync("computer_screenshot", { display: "display-2" });

    await harness.callAsync("computer_click", ClickCalls.clicking(5, 11));
    await harness.callAsync("computer_click", ClickCalls.clicking(15, 0));

    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(-6, 5)], [new DesktopPoint(-1, 0)]]);
  });
});
