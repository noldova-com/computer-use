/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendAnswerInvalidException, DesktopRect, RefusalException, RefusalReason, StackedWindow } from "@noldova/computer-use.runtime";
import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

const NOTES = WindowsBackendHarness.notes;

describe("the Windows backend's capture", () => {
  const window = new StackedWindow(NOTES, "100", new DesktopRect(-2, 5, 2, 1));

  it("measures a display in physical pixels, its scale from its dots per inch, without capturing it", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.displays = [{ id: "\\\\.\\DISPLAY1", x: -2, y: 5, width: 2, height: 1, dpi: 120, isPrimary: true }];

    const layout = await backend.capture.measureDisplayAsync("\\\\.\\DISPLAY1", HangGuard.signal());

    assert.deepEqual(api.calls.map(t => t.name), ["listDisplays"]);
    assert.equal(layout.displayId, "\\\\.\\DISPLAY1");
    assert.deepEqual(layout.frame, new DesktopRect(-2, 5, 2, 1));
    assert.equal(layout.scaleFactor, 1.25);
    assert.deepEqual([layout.width, layout.height], [2, 1]);
  });

  it("fails as the backend's own failure, naming the answer, for a display with no size", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const display = { id: "\\\\.\\DISPLAY1", x: 0, y: 0, width: 0, height: 1, dpi: 96, isPrimary: true };
    api.displays = [display];
    const measuring = backend.capture.measureDisplayAsync("\\\\.\\DISPLAY1", HangGuard.signal());

    await assert.rejects(measuring, BackendAnswerInvalidException);
    await assert.rejects(measuring, { answer: "listDisplays", value: display });
  });

  it("refuses a display it doesn't list", async () => {
    const { backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.capture.measureDisplayAsync("\\\\.\\DISPLAY9", HangGuard.signal()), (error: unknown) => {
      assert.ok(error instanceof RefusalException);
      assert.equal(error.reason, RefusalReason.OutsideDisplays);
      assert.equal(error.isInputSent, false);

      return true;
    });
  });

  it("captures a window by its handle at the frame the list gave, as the window's own pixels, within 500 ms", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.image = { width: 2, height: 1, bgra: Uint8Array.of(1, 2, 3, 255, 4, 5, 6, 255).buffer };

    const image = await backend.capture.captureWindowAsync(window, HangGuard.signal());

    assert.deepEqual(api.named("captureWindow"), [["100", -2, 5, 2, 1, 500]]);
    assert.deepEqual([image?.width, image?.height, [...image?.bgra ?? []]], [2, 1, [1, 2, 3, 255, 4, 5, 6, 255]]);
  });

  it("answers no image for a window the addon can't draw at its frame, so the screenshot covers it", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.image = null;

    assert.equal(await backend.capture.captureWindowAsync(window, HangGuard.signal()), null);
  });

  const unusable = [[0, 1, 0, ArgumentOutOfRangeException], [1.5, 1, 4, ArgumentOutOfRangeException], [1, 0, 0, ArgumentOutOfRangeException],
    [1, 1.5, 4, ArgumentOutOfRangeException], [1, 1, 3, ArgumentException]] as const;
  for (const [width, height, byteLength, refusal] of unusable) {
    it(`refuses ${byteLength} bytes as the pixels of a ${width} by ${height} window image`, async () => {
      const { api, backend } = WindowsBackendHarness.start();
      const image = { width, height, bgra: new ArrayBuffer(byteLength) };
      api.image = image;
      const capturing = backend.capture.captureWindowAsync(window, HangGuard.signal());

      await assert.rejects(capturing, BackendAnswerInvalidException);
      await assert.rejects(capturing, (error: unknown) => {
        assert.ok(error instanceof BackendAnswerInvalidException);
        assert.equal(error.answer, "captureWindow");
        assert.equal(error.value, image);
        assert.ok(error.cause instanceof Error);
        assert.equal(error.cause.constructor, refusal);
        assert.match(error.message, /^The desktop answered captureWindow with a value the module can't use: The window's image (must be whole pixels above zero|holds 3 bytes, not 4 for each of its 1 by 1 pixels)/);

        return true;
      });
    });
  }

  it("measures and captures nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.capture.measureDisplayAsync("\\\\.\\DISPLAY1", AbortSignal.abort()), { name: "AbortError" });
    await assert.rejects(backend.capture.captureWindowAsync(window, AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });
});
