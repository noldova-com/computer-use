/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, BorderFrame, ClickCount, DesktopPoint, DesktopRect, KeyName, PointerButton, ScrollAmount } from "@noldova/computer-use.runtime";
import { AddonIncompleteException, AddonLoadFailedException, AddonMissingException, WindowsBackend } from "@noldova/computer-use.runtime/windows";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

const TARGET = WindowsBackendHarness.target;

describe("the Windows backend's addon", () => {
  it("loads the addon file on the first call that needs it, and answers every call from it", async () => {
    const backend = WindowsBackend.load(WindowsBackendHarness.fixture("complete-addon.cjs"));
    const signal = HangGuard.signal();

    const displays = await backend.displays.listDisplaysAsync(signal);
    const layout = await backend.capture.measureDisplayAsync("\\\\.\\DISPLAY1", signal);
    const window = await backend.windows.getForegroundWindowAsync(signal);
    const stack = await backend.windows.listStackAsync(signal);
    const image = stack.windows[0] === undefined ? null : await backend.capture.captureWindowAsync(stack.windows[0], signal);
    const pointer = await backend.input.readPointerAsync(signal);
    await backend.input.movePointerAsync(TARGET, new DesktopPoint(3, 4), signal);
    await backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], signal);
    await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], signal);
    await backend.input.scrollAsync(TARGET, new DesktopPoint(1, 2), new ScrollAmount(0, 1), [], signal);
    await backend.input.typeTextAsync(TARGET, "a", signal);
    await backend.input.pressKeyAsync(TARGET, KeyName.Tab, [], signal);
    await backend.physicalInput.startAsync(signal);
    await backend.physicalInput.stopAsync();
    await backend.border.showAsync([new BorderFrame(new DesktopRect(0, 0, 800, 600), 4)], "#005FB8", signal);
    await backend.border.hideAsync(signal);
    const apps = await backend.apps.listAppsAsync(signal);
    const described = await backend.apps.describeAppAsync(new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs")), 64, signal);
    const tree = await backend.controls.readControlsAsync(TARGET, null, signal);
    const spot = await backend.controls.findControlAsync(TARGET, "1.1", signal);
    const isAt = await backend.controls.isControlAtAsync(TARGET, "1.1", new DesktopPoint(1, 2), signal);

    assert.equal(displays.length, 1);
    assert.equal(layout.width, 1);
    assert.equal(image?.width, 800);
    assert.equal(window?.appName, "Notes");
    assert.equal(stack.windows.length, 1);
    assert.deepEqual(pointer, new DesktopPoint(1, 2));
    assert.deepEqual(apps.map(t => [t.name, t.publisher]), [["Notes", "Example"]]);
    assert.deepEqual([described?.name, described?.publisher, described?.icon], ["Notes", "Example", null]);
    assert.deepEqual([tree.controls, spot, isAt], [[], null, false]);
  });

  it("fails each call naming the platform and architecture when the addon's file is missing", async () => {
    const file = WindowsBackendHarness.fixture("missing-addon.node");
    const backend = WindowsBackend.load(file);

    await assert.rejects(backend.displays.listDisplaysAsync(HangGuard.signal()), (error: unknown) => {
      assert.ok(error instanceof AddonMissingException);
      assert.equal(error.message, `There is no ${process.platform}-${process.arch} build of the addon: ${file} is missing.`);
      assert.deepEqual([error.file, error.target], [file, `${process.platform}-${process.arch}`]);

      return true;
    });
  });

  it("fails each call with the addon's path when the file can't be loaded", async () => {
    const file = WindowsBackendHarness.fixture("broken-addon.cjs");
    const backend = WindowsBackend.load(file);

    await assert.rejects(backend.displays.listDisplaysAsync(HangGuard.signal()), (error: unknown) => {
      assert.ok(error instanceof AddonLoadFailedException);
      assert.equal(error.message, `The addon ${file} couldn't be loaded.`);
      assert.equal(error.file, file);
      assert.ok(error.cause instanceof Error);

      return true;
    });
  });

  for (const [addon, name] of [["lacks a function the module calls", "incomplete-addon.cjs"], ["exports a value, not functions", "value-addon.cjs"]] as const)
    it(`fails as incomplete when the addon ${addon}`, async () => {
      const file = WindowsBackendHarness.fixture(name);

      await assert.rejects(WindowsBackend.load(file).displays.listDisplaysAsync(HangGuard.signal()), (error: unknown) => {
        assert.ok(error instanceof AddonIncompleteException);
        assert.equal(error.name, "AddonIncompleteException");
        assert.equal(error.message, `The addon ${file} lacks a function the module calls.`);
        assert.equal(error.file, file);

        return true;
      });
    });
});
