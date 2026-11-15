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
import { DesktopRect } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolFailureCode } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;
const TERMINAL = RuntimeHarness.terminal.identity;

describe("computer_zoom", () => {
  it("shows a region of the latest screenshot from a new capture at the capture's own pixels, keeping the frame", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(0, 0, 8, 6)])];
    await harness.callAsync("computer_screenshot", { scale: 0.5 });

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_zoom", { region: [2, 0, 4, 3] }));
    const again = ScreenImages.read(await harness.callAsync("computer_zoom", { region: [0, 0, 4, 3], scale: 0.5 }));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, () => true).map(t => t.slice(4)));
    assert.deepEqual(text, { zoom: { frame: "1", region: [2, 0, 4, 3], width: 4, height: 6 } });
    assert.deepEqual(again.text, { zoom: { frame: "1", region: [0, 0, 4, 3], width: 4, height: 3 } });
    assert.deepEqual(harness.backend.capture.requests, ["display-1", "display-1", "display-1"]);
  });

  it("masks the region as a screenshot is masked", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([TERMINAL, new DesktopRect(6, 0, 2, 6)], [NOTES, new DesktopRect(0, 0, 8, 6)])];
    await harness.callAsync("computer_screenshot", {});

    const { image } = ScreenImages.read(await harness.callAsync("computer_zoom", { region: [4, 0, 8, 6] }));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(8, 6, x => x < 6).map(t => t.slice(4)));
  });

  it("maps the region through a display's own scale and position", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.stacks = [ScreenImages.stackOf([NOTES, new DesktopRect(-8, 0, 8, 6)])];
    await harness.callAsync("computer_screenshot", { display: "display-2", scale: 0.5 });

    const { image, text } = ScreenImages.read(await harness.callAsync("computer_zoom", { region: [1, 1, 3, 3] }));

    assert.deepEqual(image.rows(), ScreenImages.expectedRows(16, 12, () => true).slice(2, 6).map(t => t.slice(2, 6)));
    assert.deepEqual(text, { zoom: { frame: "1", region: [1, 1, 3, 3], width: 4, height: 4 } });
  });

  it("refuses a zoom before the session's first screenshot, and after its session ended", async () => {
    const harness = await ScreenImages.startAsync();

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_zoom", { region: [0, 0, 1, 1] }), ToolFailureCode.Refused, /^There is no full screenshot to zoom into yet\./);
    await harness.callAsync("computer_screenshot", {});
    harness.endSession(RuntimeHarness.sessionId);
    const call = harness.callAsync("computer_zoom", { region: [0, 0, 1, 1] });
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Refused, /^There is no full screenshot to zoom into yet\./);
  });

  for (const region of [[0, 0, 9, 6], [0, 0, 8, 7], [-1, 0, 1, 1], [0, -1, 1, 1], [2, 0, 2, 1], [0, 3, 1, 3], [3, 0, 2, 1]])
    it(`refuses the region ${JSON.stringify(region)} of an 8 by 6 screenshot without capturing`, async () => {
      const harness = await ScreenImages.startAsync();
      await harness.callAsync("computer_screenshot", {});

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_zoom", { region }), ToolFailureCode.Refused, /^The region must be inside the latest full screenshot, 8 by 6 pixels, and not empty\.$/);
      assert.deepEqual(harness.backend.capture.requests, ["display-1"]);
    });

  const refused: readonly JsonObject[] = [{}, { region: [0, 0, 1] }, { region: [0, 0, 1.5, 1] }, { region: "0,0,1,1" }, { region: [0, 0, 1, 1], display: "display-1" }, { region: [0, 0, 1, 1], scale: 2 }];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)}`, async () => {
      const harness = await ScreenImages.startAsync();
      await harness.callAsync("computer_screenshot", {});

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_zoom", input), ToolFailureCode.Refused, /^computer_zoom takes region/);
    });

  it("fails as stale when the display moved or changed size after the screenshot", async () => {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", {});

    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 10, 6), 10, 6));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_zoom", { region: [0, 0, 1, 1] }), ToolFailureCode.Stale, /^The display changed after the latest full screenshot\./);
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(1, 0, 8, 6), 8, 6));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_zoom", { region: [0, 0, 1, 1] }), ToolFailureCode.Stale);
  });
});
