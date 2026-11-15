/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendAnswerInvalidException, DesktopPoint, DesktopRect } from "@noldova/computer-use.runtime";
import { WindowsBackend } from "@noldova/computer-use.runtime/windows";
import { ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { WindowsDesktopApiDouble } from "../doubles/windows-desktop-api-double.fixture.ts";
import { ClickCalls } from "./click-calls.fixture.ts";
import { KeyCalls } from "./key-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";
import { TypeCalls } from "./type-calls.fixture.ts";

describe("the input to the window in front", () => {
  it("refuses a point another app's window covers, naming the app, but clicks the app's own popup there", async () => {
    const harness = await ClickCalls.shotAsync();
    const asked = harness.center.records().length;
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.terminal.identity, new DesktopRect(4, 0, 4, 6)], [RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"])];

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(5, 1)), ToolFailureCode.Refused, /^A point of the call lies over a window of C:\\Windows\\System32\\cmd\.exe, which covers Notes there\. Nothing was sent\./);
    assert.equal(harness.center.records().length, asked);
    assert.equal(harness.input.sent.length, 0);

    await harness.callAsync("computer_click", ClickCalls.clicking(3, 1));
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(4, 0, 4, 6), "7"], [RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"])];
    await harness.callAsync("computer_click", ClickCalls.clicking(5, 1));
    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(3, 1)], [new DesktopPoint(5, 1)]]);
  });

  it("refuses a point over no window, or over one that belongs to no app, before raising anything", async () => {
    const harness = await ClickCalls.shotAsync();
    const asked = harness.center.records().length;

    harness.windows.stacks = [ScreenImages.stackOf([null, new DesktopRect(4, 0, 4, 6)], [RuntimeHarness.notes.identity, new DesktopRect(0, 0, 4, 6), "100"])];
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(5, 1)), ToolFailureCode.Refused, /^A point of the call lies over no app's window, or over one that belongs to no app/);
    harness.windows.stacks = [ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(0, 0, 4, 6), "100"])];
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(5, 1)), ToolFailureCode.Refused, /^A point of the call lies over no app's window/);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails as unavailable when the windows under the point can't be read, and by the call's end when it ends while they are read", async () => {
    const harness = await ClickCalls.shotAsync();
    const asked = harness.center.records().length;
    harness.windows.listStackAsync = async () => {
      throw new BackendFailureException("The list broke.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(1, 1)), ToolFailureCode.Unavailable, /^The windows under the call's points could not be read\. Nothing was sent\.$/);

    const failing = new AbortController();
    harness.windows.listStackAsync = async () => {
      failing.abort(ToolAbortReason.Cancelled);
      throw new Error("The list stopped.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(1, 1), failing.signal), ToolFailureCode.Cancelled);

    const listing = new AbortController();
    harness.windows.listStackAsync = async () => {
      listing.abort(ToolAbortReason.Cancelled);

      return ScreenImages.stackOf([RuntimeHarness.notes.identity, new DesktopRect(0, 0, 8, 6), "100"]);
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(1, 1), listing.signal), ToolFailureCode.Cancelled);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails as unavailable, sending nothing, when the window in front the Windows backend reads has no size", async () => {
    const api = new WindowsDesktopApiDouble();
    api.foreground = { windowId: "100", processId: 42, imagePath: "C:\\Program Files\\Notes\\notes.exe", className: "Notes", x: 0, y: 0, width: 0, height: 0, isElevated: false };
    const windows = new WindowsBackend(api).windows;
    const calls = [
      [await ClickCalls.shotAsync(), "computer_click", ClickCalls.clicking(1, 1)],
      [await KeyCalls.grantedAsync(), "computer_key", KeyCalls.pressing("Enter")],
      [await TypeCalls.grantedAsync(), "computer_type", TypeCalls.typing("a")]
    ] as const;

    for (const [harness, name, input] of calls) {
      harness.windows.getForegroundWindowAsync = async signal => await windows.getForegroundWindowAsync(signal);
      await assert.rejects(harness.callDirectlyAsync(name, input), (error: unknown) =>
        error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.failure.message === "The window in front could not be read. Nothing was sent."
        && error.cause instanceof BackendAnswerInvalidException);
      assert.deepEqual(harness.input.sent, []);
    }
  });

  it("passes on a failure reading the window in front that isn't the backend's own, sending nothing", async () => {
    const harness = await ClickCalls.shotAsync();
    const defect = new TypeError("A defect in the module.");
    harness.windows.getForegroundWindowAsync = async () => {
      throw defect;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(1, 1)), (error: unknown) => error === defect);
    assert.deepEqual(harness.input.sent, []);
  });
});
