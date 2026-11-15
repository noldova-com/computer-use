/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { DesktopRect } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const TARGET = MacBackendHarness.target;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's window in front", () => {
  it("names the window's app by its bundle identifier and its own name, never elevated", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("getForegroundWindow", { windowId: "100", processId: 42, bundleId: "com.Example.Notes", appName: "Notes", x: 10, y: 20, width: 800, height: 600 });

    const window = await backend.windows.getForegroundWindowAsync(HangGuard.signal());

    assert.equal(window?.app.id, "com.example.notes");
    assert.equal(window?.appName, "Notes");
    assert.deepEqual(window?.target, TARGET);
    assert.deepEqual(window?.frame, new DesktopRect(10, 20, 800, 600));
    assert.equal(window?.isElevated, false);
  });

  it("reports no window when none is in front", async () => {
    const { backend } = MacBackendHarness.start();

    assert.equal(await backend.windows.getForegroundWindowAsync(HangGuard.signal()), null);
  });

  it("reads nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();

    await assert.rejects(backend.windows.getForegroundWindowAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
  });
});

describe("the macOS backend's window stack", () => {
  it("lists the windows from the front by window number and bundle identifier, and no app for a process without one", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("listWindows", {
      isComplete: false,
      windows: [{ windowId: "100", bundleId: "com.example.notes", x: -10, y: 20, width: 800, height: 600 }, { windowId: "7", bundleId: "", x: 0, y: 0, width: 1920, height: 24 }]
    });

    const stack = await backend.windows.listStackAsync(HangGuard.signal());

    assert.equal(stack.isComplete, false);
    assert.deepEqual(stack.windows.map(t => [t.app?.id ?? null, t.windowId, t.frame]), [["com.example.notes", "100", new DesktopRect(-10, 20, 800, 600)], [null, "7", new DesktopRect(0, 0, 1920, 24)]]);
  });

  it("lists nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();

    await assert.rejects(backend.windows.listStackAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
  });
});
