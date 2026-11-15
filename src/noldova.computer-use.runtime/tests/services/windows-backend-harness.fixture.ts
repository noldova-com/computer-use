/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { fileURLToPath } from "node:url";

import { AppIdentity, type DesktopPoint, GlidePath, InputTarget } from "@noldova/computer-use.runtime";
import { WindowsBackend } from "@noldova/computer-use.runtime/windows";

import { WindowsDesktopApiDouble } from "../doubles/windows-desktop-api-double.fixture.ts";

export class WindowsBackendHarness {
  public static readonly notesPath: string = "C:\\Apps\\Notes.exe";
  public static readonly notes: AppIdentity = AppIdentity.ofWindowsPath(WindowsBackendHarness.notesPath);
  public static readonly target: InputTarget = new InputTarget(WindowsBackendHarness.notes, "100", 42);
  public static readonly targetJson: object = { windowId: "100", processId: 42, imagePath: "c:\\apps\\notes.exe" };

  public static start(): { readonly api: WindowsDesktopApiDouble; readonly backend: WindowsBackend } {
    const api = new WindowsDesktopApiDouble();

    return { api, backend: new WindowsBackend(api) };
  }

  public static stepsOf(from: DesktopPoint, to: DesktopPoint): readonly { readonly x: number; readonly y: number; readonly atMs: number }[] {
    return GlidePath.between(from, to).steps.map(t => ({ x: t.point.x, y: t.point.y, atMs: t.atMs }));
  }

  public static fixture(name: string): string {
    return fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  }

  public static addonFailure(message: string): Error {
    return Object.assign(new Error(message), { code: "ERR_WINDOWS_DESKTOP" });
  }
}
