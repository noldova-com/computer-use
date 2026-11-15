/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { after, describe, it } from "node:test";

import { DesktopRect, RefusalException, RefusalReason } from "@noldova/computer-use.runtime";
import { MacBackend, MacCaptureEndedException, MacCaptureFailedException, MacScriptFailedException } from "@noldova/computer-use.runtime/macos";
import { ProcessExit } from "@noldova/desktop.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";
import { PngFile } from "./png-file.fixture.ts";

const DISPLAY = MacBackendHarness.display;
const WINDOW = MacBackendHarness.window;
const SHOWN_JSON = MacBackendHarness.shownJson;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's capture", () => {
  it("measures a display in points, with its backing scale's pixels, and captures nothing", async () => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    channel.answers.set("listDisplays", [{ ...DISPLAY, scaleFactor: 2 }]);

    const layout = await backend.capture.measureDisplayAsync(DISPLAY.id, HangGuard.signal());

    assert.deepEqual(channel.calls.map(t => t.method), ["checkGrants", "listDisplays"]);
    assert.equal(layout.displayId, DISPLAY.id);
    assert.deepEqual(layout.frame, new DesktopRect(-2, 5, 2, 2));
    assert.equal(layout.scaleFactor, 2);
    assert.deepEqual([layout.width, layout.height], [4, 4]);
    assert.deepEqual(capturer.windows, []);
  });

  it("refuses a display that isn't current", async () => {
    const { backend } = MacBackendHarness.start();

    await assert.rejects(backend.capture.measureDisplayAsync("gone", HangGuard.signal()), { reason: RefusalReason.OutsideDisplays });
  });

  it("captures a window by its number while it shows where the list gave it, and hands over its pixels", async () => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    channel.answers.set("readWindow", SHOWN_JSON);
    capturer.png = PngFile.build({ width: 4, height: 4, pixels: Array.from({ length: 16 }, () => [1, 2, 3]), hasAlpha: false, filters: [0, 0, 0, 0] });

    const image = await backend.capture.captureWindowAsync(WINDOW, HangGuard.signal());

    assert.deepEqual(channel.calls, [{ method: "checkGrants", parameters: {} }, { method: "readWindow", parameters: { windowId: "100" } }]);
    assert.deepEqual(capturer.windows, ["100"]);
    assert.deepEqual([image?.width, image?.height], [4, 4]);
    assert.deepEqual([...image?.bgra.subarray(0, 4) ?? []], [3, 2, 1, 255]);
  });

  const moved: readonly { readonly name: string; readonly shown: object | null }[] = [
    { name: "has gone", shown: null },
    { name: "belongs to another app", shown: { ...SHOWN_JSON, bundleId: "com.example.other" } },
    { name: "moved across", shown: { ...SHOWN_JSON, x: -1 } },
    { name: "moved down", shown: { ...SHOWN_JSON, y: 6 } },
    { name: "is wider", shown: { ...SHOWN_JSON, width: 3 } },
    { name: "is taller", shown: { ...SHOWN_JSON, height: 3 } }
  ];
  for (const { name, shown } of moved)
    it(`has no image for a window that ${name} since the list, and doesn't capture it`, async () => {
      const { channel, capturer, backend } = MacBackendHarness.start();
      channel.answers.set("readWindow", shown);

      assert.equal(await backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), null);
      assert.deepEqual(capturer.windows, []);
    });

  it("has no image for a window that closes as screencapture captures it", async () => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    const answers = [SHOWN_JSON, null];
    channel.answers.setBy("readWindow", () => answers.shift());
    capturer.error = new MacCaptureFailedException(new MacCaptureEndedException(new ProcessExit(1, null)));

    assert.equal(await backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), null);
    assert.deepEqual([capturer.windows, channel.named("readWindow").length], [["100"], 2]);
  });

  it("passes on a capture's failure other than screencapture's own as it is, without reading the window again", async () => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    const answers = [SHOWN_JSON, null];
    channel.answers.setBy("readWindow", () => answers.shift());
    const defect = new TypeError("A defect in the module.");
    capturer.error = defect;

    await assert.rejects(backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), (thrown: unknown) => thrown === defect);
    assert.equal(channel.named("readWindow").length, 1);
  });

  it("ends the capture when the call is cancelled during it, and doesn't read the window again", async t => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    channel.answers.set("readWindow", SHOWN_JSON);
    const started = Promise.withResolvers<void>();
    t.mock.method(capturer, "captureWindowAsync", async (_windowId: string, signal: AbortSignal): Promise<Uint8Array> => {
      started.resolve();
      await once(signal, "abort");
      signal.throwIfAborted();

      return new Uint8Array(0);
    });
    const controller = new AbortController();

    const capture = backend.capture.captureWindowAsync(WINDOW, controller.signal);
    await started.promise;
    controller.abort();

    await assert.rejects(capture, { name: "AbortError" });
    assert.equal(channel.named("readWindow").length, 1);
  });

  it("fails as screencapture fails on a window that still shows", async () => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    channel.answers.set("readWindow", SHOWN_JSON);
    const error = new MacCaptureFailedException(new MacCaptureEndedException(new ProcessExit(1, null)));
    capturer.error = error;

    await assert.rejects(backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), (thrown: unknown) => thrown === error);
  });

  const calls: readonly (readonly [string, (backend: MacBackend, signal: AbortSignal) => Promise<unknown>])[] = [
    ["measure", async (backend, signal) => await backend.capture.measureDisplayAsync(DISPLAY.id, signal)],
    ["window capture", async (backend, signal) => await backend.capture.captureWindowAsync(WINDOW, signal)]
  ];
  for (const [name, callAsync] of calls) {
    it(`refuses a ${name} that would show only the desktop picture, before it captures`, async () => {
      const { channel, capturer, backend } = MacBackendHarness.start();
      channel.answers.set("checkGrants", { screenRecording: false, accessibility: true });
      channel.answers.set("listDisplays", [DISPLAY]);
      channel.answers.set("readWindow", SHOWN_JSON);

      await assert.rejects(callAsync(backend, HangGuard.signal()), (error: unknown) => {
        assert.ok(error instanceof RefusalException);
        assert.equal(error.reason, RefusalReason.DesktopOnlyCapture);
        assert.equal(error.isInputSent, false);
        assert.match(error.message, /Screen Recording grant is missing/u);

        return true;
      });
      assert.deepEqual([channel.calls.map(t => t.method), capturer.windows], [["checkGrants"], []]);
    });

    it(`does nothing in a ${name} once the call has ended`, async () => {
      const { channel, capturer, backend } = MacBackendHarness.start();

      await assert.rejects(callAsync(backend, AbortSignal.abort()), { name: "AbortError" });
      assert.deepEqual([channel.calls, capturer.windows], [[], []]);
    });

    it(`fails a ${name} as the input process fails`, async () => {
      const { channel, backend } = MacBackendHarness.start();
      channel.failures.add("checkGrants");

      await assert.rejects(callAsync(backend, HangGuard.signal()), MacScriptFailedException);
    });
  }
});
