/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendAnswerInvalidException, DesktopRect, ProgramPathInvalidException } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

const NOTES_PATH = WindowsBackendHarness.notesPath;
const TARGET = WindowsBackendHarness.target;

describe("the Windows backend's window in front", () => {
  it("names the window's app by its program's canonical path and its file name", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.foreground = { windowId: "100", processId: 42, imagePath: NOTES_PATH, className: "Notes", x: 10, y: 20, width: 800, height: 600, isElevated: true };

    const window = await backend.windows.getForegroundWindowAsync(HangGuard.signal());

    assert.equal(window?.app.id, "c:\\apps\\notes.exe");
    assert.equal(window?.appName, "Notes");
    assert.deepEqual(window?.target, TARGET);
    assert.deepEqual(window?.frame, new DesktopRect(10, 20, 800, 600));
    assert.equal(window?.isElevated, true);
  });

  it("fails as the backend's own failure, naming the answer, for a window in front with no size", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const window = { windowId: "100", processId: 42, imagePath: NOTES_PATH, className: "Notes", x: 10, y: 20, width: 0, height: 0, isElevated: false };
    api.foreground = window;
    const reading = backend.windows.getForegroundWindowAsync(HangGuard.signal());

    await assert.rejects(reading, BackendAnswerInvalidException);
    await assert.rejects(reading, {
      message: "The desktop answered getForegroundWindow with a value the module can't use: The rectangle at 10, 20 of 0 by 0 must be whole desktop units, with a size above zero. (Parameter 'width')",
      answer: "getForegroundWindow",
      value: window
    });
    await assert.rejects(reading, (error: unknown) => error instanceof BackendAnswerInvalidException && error.cause instanceof ArgumentOutOfRangeException);
  });

  it("reports no window when none is in front", async () => {
    const { backend } = WindowsBackendHarness.start();

    assert.equal(await backend.windows.getForegroundWindowAsync(HangGuard.signal()), null);
  });

  it("gives File Explorer a folder window in front, and reports no window when its desktop, taskbar or window switcher is", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const readAsync = async (className: string): Promise<string | null> => {
      api.foreground = { windowId: "100", processId: 42, imagePath: "C:\\Windows\\Explorer.EXE", className, x: 0, y: 0, width: 10, height: 10, isElevated: false };

      return (await backend.windows.getForegroundWindowAsync(HangGuard.signal()))?.app.id ?? null;
    };

    assert.deepEqual([await readAsync("CabinetWClass"), await readAsync("Shell_TrayWnd"), await readAsync("XamlExplorerHostIslandWindow"), await readAsync("Progman"), await readAsync("")], ["c:\\windows\\explorer.exe", null, null, null, null]);
  });
});

describe("the Windows backend's window stack", () => {
  it("lists the windows from the front, each named by its program's canonical path, and whether the list is complete", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.windowList = { isComplete: false, windows: [{ className: "Notes", imagePath: NOTES_PATH, windowId: "100", x: -10, y: 20, width: 800, height: 600 }, { className: "Host", imagePath: "C:\\Apps\\Host.exe", windowId: "200", x: 0, y: 0, width: 1920, height: 1080 }] };

    const stack = await backend.windows.listStackAsync(HangGuard.signal());

    assert.equal(stack.isComplete, false);
    assert.deepEqual(stack.windows.map(t => [t.app?.id, t.windowId, t.frame]), [["c:\\apps\\notes.exe", "100", new DesktopRect(-10, 20, 800, 600)], ["c:\\apps\\host.exe", "200", new DesktopRect(0, 0, 1920, 1080)]]);
  });

  it("gives File Explorer only its folder windows, and no app the desktop, taskbar and window switcher it also draws", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const explorer = "C:\\Windows\\Explorer.EXE";
    api.windowList = { isComplete: true, windows: ["CabinetWClass", "Shell_TrayWnd", "XamlExplorerHostIslandWindow", "Progman", ""].map((t, index) => ({ className: t, imagePath: explorer, windowId: `${index + 1}`, x: 0, y: 0, width: 10, height: 10 })) };

    const stack = await backend.windows.listStackAsync(HangGuard.signal());

    assert.deepEqual(stack.windows.map(t => t.app?.id ?? null), ["c:\\windows\\explorer.exe", null, null, null, null]);
  });

  it("names no app for a window whose program Windows won't read", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.windowList = { isComplete: true, windows: [{ className: "Notes", imagePath: "", windowId: "100", x: 0, y: 0, width: 10, height: 10 }] };

    const stack = await backend.windows.listStackAsync(HangGuard.signal());

    assert.equal(stack.windows[0]?.app, null);
  });

  const refused = [
    [{ className: "Notes", imagePath: "notes.exe", windowId: "100", x: 0, y: 0, width: 10, height: 10 }, ProgramPathInvalidException],
    [{ className: "Notes", imagePath: NOTES_PATH, windowId: "100", x: 0, y: 0, width: 0, height: 10 }, BackendAnswerInvalidException],
    [{ className: "Notes", imagePath: NOTES_PATH, windowId: "0x64", x: 0, y: 0, width: 10, height: 10 }, BackendAnswerInvalidException]
  ] as const;
  for (const [window, exception] of refused)
    it(`refuses the window ${JSON.stringify(window)} rather than place it`, async () => {
      const { api, backend } = WindowsBackendHarness.start();
      api.windowList = { isComplete: true, windows: [window] };

      await assert.rejects(backend.windows.listStackAsync(HangGuard.signal()), exception);
    });

  it("lists nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.windows.listStackAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });
});
