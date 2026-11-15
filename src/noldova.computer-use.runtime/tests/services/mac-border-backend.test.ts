/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { BorderFrame, Display } from "@noldova/computer-use.runtime";
import { MacScriptFailedException } from "@noldova/computer-use.runtime/macos";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's border", () => {
  it("has the input process draw each display's frame in points, a CSS pixel being one point at any backing scale", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const displays = [new Display("1", 0, 0, 1512, 982, 2, true), new Display("2", -1920, 0, 1920, 1080, 1, false)];

    await backend.border.showAsync(displays.map(t => BorderFrame.of(t, backend.border.unitsPerPixel(t))), "#005FB8", HangGuard.signal());
    await backend.border.hideAsync(HangGuard.signal());

    assert.deepEqual(channel.calls, [
      {
        method: "showBorder",
        parameters: {
          frames: [{ x: 0, y: 0, width: 1512, height: 982, thickness: 4 }, { x: -1920, y: 0, width: 1920, height: 1080, thickness: 4 }],
          color: "#005FB8"
        }
      },
      { method: "hideBorder", parameters: {} }
    ]);
  });

  it("fails as the input process fails", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.failures.add("showBorder");

    await assert.rejects(backend.border.showAsync([], "#005FB8", HangGuard.signal()), MacScriptFailedException);
  });

  it("asks the input process nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const signal = AbortSignal.abort();

    await assert.rejects(backend.border.showAsync([], "#005FB8", signal), { name: "AbortError" });
    await assert.rejects(backend.border.hideAsync(signal), { name: "AbortError" });

    assert.deepEqual(channel.calls, []);
  });
});
