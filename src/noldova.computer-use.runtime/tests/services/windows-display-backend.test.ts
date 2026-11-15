/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Display } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

describe("the Windows backend's displays", () => {
  it("lists each display with its scale from its dots per inch", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.displays = [
      { id: "\\\\.\\DISPLAY1", x: 0, y: 0, width: 2560, height: 1440, dpi: 144, isPrimary: true },
      { id: "\\\\.\\DISPLAY2", x: -1920, y: 0, width: 1920, height: 1080, dpi: 96, isPrimary: false }
    ];

    const displays = await backend.displays.listDisplaysAsync(HangGuard.signal());

    assert.deepEqual(displays, [
      new Display("\\\\.\\DISPLAY1", 0, 0, 2560, 1440, 1.5, true),
      new Display("\\\\.\\DISPLAY2", -1920, 0, 1920, 1080, 1, false)
    ]);
  });

  it("reads nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.displays.listDisplaysAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });
});
