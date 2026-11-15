/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Display } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's displays", () => {
  it("lists each display in points with its backing scale", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("listDisplays", [
      { id: "1", x: 0, y: 0, width: 1512, height: 982, scaleFactor: 2, isPrimary: true },
      { id: "2", x: -1920, y: 0, width: 1920, height: 1080, scaleFactor: 1, isPrimary: false }
    ]);

    assert.deepEqual(await backend.displays.listDisplaysAsync(HangGuard.signal()), [
      new Display("1", 0, 0, 1512, 982, 2, true),
      new Display("2", -1920, 0, 1920, 1080, 1, false)
    ]);
  });

  it("reads nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();

    await assert.rejects(backend.displays.listDisplaysAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
  });
});
