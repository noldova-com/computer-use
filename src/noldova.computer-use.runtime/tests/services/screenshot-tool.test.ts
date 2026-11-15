/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { DesktopRect, RefusalReason } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolFailureCode } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;
const WHOLE = new DesktopRect(0, 0, 8, 6);

describe("computer_screenshot", () => {
  it("covers a granted app from the next screenshot once its grant is revoked in the app's settings, without asking", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 4, 6)], [NOTES, new DesktopRect(4, 0, 4, 6)])];
    ScreenImages.read(await harness.callAsync("computer_screenshot", {}));
    const asked = harness.answerer.delivered().length;
    const records = harness.center.records().length;

    for (const answer of harness.center.remembered().filter(t => t.action === "computer-use.controlApp"))
      harness.center.forget(answer);
    const captured = harness.backend.capture.windows.length;
    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, () => false));
    assert.equal(harness.backend.capture.windows.length, captured);
    assert.equal(harness.answerer.delivered().length, asked);
    const requests = harness.center.records().slice(records).filter(t => t.action === "computer-use.controlApp");
    assert.deepEqual(requests.map(t => [t.action, t.subject, t.isRemembered]), [["computer-use.controlApp", NOTES.id, false]]);
  });

  it("covers every window in a conversation granted no app", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, WHOLE])];
    harness.endSession(RuntimeHarness.sessionId);

    const call = harness.callAsync("computer_screenshot", {}, undefined, "conversation-2", "session-2");
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    const { image } = ScreenImages.read(await call);

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, () => false));
  });

  it("captures the display it names, in its own pixels, and gives each screenshot a new ID", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(-7, 1, 3, 2)])];

    await harness.callAsync("computer_screenshot", {});
    assert.deepEqual(harness.backend.capture.windows, []);
    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", { display: "display-2" }));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(16, 12, (x, y) => x >= 2 && x < 8 && y >= 2 && y < 6));
    assert.deepEqual(text, { frame: { id: "2", display: "display-2", width: 16, height: 12, scale: 2 } });
  });

  const refused: readonly JsonObject[] = [{ region: [0, 0, 1, 1] }, { display: "" }, { display: 1 }, { scale: 0.05 }, { scale: 1.5 }, { scale: "1" }];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)} without capturing`, async () => {
      const harness = await ScreenImages.startAsync();

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_screenshot", input), ToolFailureCode.Refused, /^computer_screenshot takes an optional display/);
      assert.deepEqual(harness.backend.capture.requests, []);
    });

  it("refuses a display it doesn't list, and a default when no display is the primary one", async () => {
    const harness = await ScreenImages.startAsync();

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", { display: "display-9" }), ToolFailureCode.Refused, /^There is no display display-9\./);
    harness.backend.displays.displays = [ScreenImages.left];
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", {}), ToolFailureCode.Refused, /^No display is the primary one/);
    assert.deepEqual(harness.backend.capture.requests, []);
  });

  it("fails as unavailable when the displays or the windows can't be listed", async () => {
    const harness = await ScreenImages.startAsync();

    harness.backend.displays.failure = new BackendFailureException("The displays are gone.");
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", {}), ToolFailureCode.Unavailable, /^The screen could not be captured\.$/);
    harness.backend.displays.failure = undefined;
    harness.windows.stacks = [];
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", {}), ToolFailureCode.Unavailable, /^The screen could not be captured\.$/);
  });

  it("fails by the backend's refusal: refused for a missing grant, stale for a display that went away", async () => {
    const harness = await ScreenImages.startAsync();

    harness.backend.capture.refusal = RefusalReason.MissingGrant;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", {}), ToolFailureCode.Refused);
    harness.backend.capture.refusal = RefusalReason.OutsideDisplays;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", {}), ToolFailureCode.Stale);
  });

  it("fails as cancelled when the call is cancelled during the capture", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, WHOLE])];
    const controller = new AbortController();
    const captureAsync = harness.backend.capture.captureWindowAsync.bind(harness.backend.capture);
    harness.backend.capture.captureWindowAsync = async (window, signal) => {
      const result = await captureAsync(window, signal);
      controller.abort();

      return result;
    };

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_screenshot", {}, controller.signal), ToolFailureCode.Cancelled);
  });
});
