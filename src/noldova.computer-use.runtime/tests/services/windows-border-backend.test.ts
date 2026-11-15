/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BorderFrame, Display } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

describe("the Windows backend's border", () => {
  it("draws each display's frame in physical pixels and the colour as 0xRRGGBB, a CSS pixel spanning the display's scale", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const displays = [new Display("\\\\.\\DISPLAY1", 0, 0, 3840, 2160, 1.5, true), new Display("\\\\.\\DISPLAY2", -1920, 0, 1920, 1080, 1, false)];

    await backend.border.showAsync(displays.map(t => BorderFrame.of(t, backend.border.unitsPerPixel(t))), "#4DAAFC", HangGuard.signal());
    await backend.border.hideAsync(HangGuard.signal());

    assert.deepEqual(api.calls.map(t => t.name), ["showBorder", "hideBorder"]);
    assert.deepEqual(api.named("showBorder"), [[[
      { x: 0, y: 0, width: 3840, height: 2160, thickness: 6 },
      { x: -1920, y: 0, width: 1920, height: 1080, thickness: 4 }
    ], 0x4DAAFC]]);
  });

  it("asks the addon nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = AbortSignal.abort();

    await assert.rejects(backend.border.showAsync([], "#005FB8", signal), { name: "AbortError" });
    await assert.rejects(backend.border.hideAsync(signal), { name: "AbortError" });

    assert.deepEqual(api.calls, []);
  });
});
