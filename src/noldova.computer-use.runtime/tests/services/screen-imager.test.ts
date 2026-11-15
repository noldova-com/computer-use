/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopRect, WindowStack } from "@noldova/computer-use.runtime";
import { ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;

const TERMINAL = RuntimeHarness.terminal.identity;

const WHOLE = new DesktopRect(0, 0, 8, 6);

describe("the screen imager", () => {
  it("retakes the capture while the window lists before and after it differ, and masks the one they agree on", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, WHOLE]), ScreenImages.stackOf([NOTES, new DesktopRect(4, 0, 4, 6)])];

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, x => x >= 4));
    assert.deepEqual(harness.backend.capture.windows, ["1", "1"]);
    assert.equal(harness.windows.stackListings, 3);
  });

  it("covers everything from the first window the lists differ on back when they still differ after three captures", async () => {
    const harness = await ScreenImages.startAsync();
    const moving = (x: number): WindowStack => ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 4, 6)], [TERMINAL, new DesktopRect(x, 0, 1, 6)], [NOTES, WHOLE]);
    harness.windows.stacks = [moving(4), moving(6), moving(4), moving(6)];

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, x => x < 4));
    assert.deepEqual(harness.backend.capture.windows, ["1", "3", "1", "3", "1", "3"]);
    assert.equal(harness.windows.stackListings, 4);
  });

  it("checks each granted app in the lists once a capture, answered from its remembered grant", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 4, 6)], [TERMINAL, new DesktopRect(4, 0, 4, 6)], [NOTES, WHOLE])];
    const records = harness.center.records().length;

    const { image } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, x => x < 4));
    const requests = harness.center.records().slice(records).filter(t => t.action === "computer-use.controlApp");
    assert.deepEqual(requests.map(t => [t.action, t.subject, t.isRemembered, t.details]), [["computer-use.controlApp", NOTES.id, true, [{ name: "app", value: "Notes" }, { name: "identity", value: NOTES.id }]]]);
  });

  it("shrinks an image that encodes over 1 MiB until it fits", async () => {
    const harness = await ScreenImages.startAsync();
    harness.backend.capture.set(ScreenImages.noiseOf(900, 500));
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 900, 500)])];

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_screenshot", {}));

    assert.deepEqual([image.width, image.height], [720, 400]);
    assert.deepEqual(text, { frame: { id: "1", display: "display-1", width: 720, height: 400, scale: 0.8 } });
  });

  it("fails as too large when the image still encodes over 1 MiB after it shrinks twice", async () => {
    const harness = await ScreenImages.startAsync();
    harness.backend.capture.set(ScreenImages.noiseOf(1430, 804));
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 1430, 804)])];

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_screenshot", {}), ToolFailureCode.TooLarge, /^The image is still over 1 MiB at 915 by 514 pixels\./);
  });

  it("fails as unavailable, keeping the backend's failure as its cause, when the display can't be measured for the capture", async () => {
    const harness = await ScreenImages.startAsync();
    const failure = new BackendFailureException("measureDisplay");
    harness.backend.capture.measureDisplayAsync = async () => {
      throw failure;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_screenshot", {}), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.failure.message === "The screen could not be captured." && error.cause === failure);
  });
});
