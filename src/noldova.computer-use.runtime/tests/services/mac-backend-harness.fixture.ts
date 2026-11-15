/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";

import { AppIdentity, type DesktopPoint, DesktopRect, GlidePath, InputTarget, StackedWindow } from "@noldova/computer-use.runtime";

import { MacBackendParts } from "./mac-backend-parts.fixture.ts";

export class MacBackendHarness {
  public static readonly notes: AppIdentity = AppIdentity.ofMacBundleId("com.example.notes");
  public static readonly target: InputTarget = new InputTarget(MacBackendHarness.notes, "100", 42);
  public static readonly targetJson: object = { windowId: "100", processId: 42, bundleId: "com.example.notes" };
  public static readonly display: { readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly scaleFactor: number; readonly isPrimary: boolean } =
    { id: "69733382", x: -2, y: 5, width: 2, height: 2, scaleFactor: 1, isPrimary: true };
  public static readonly window: StackedWindow = new StackedWindow(MacBackendHarness.notes, "100", new DesktopRect(-2, 5, 2, 2));
  public static readonly shownJson: object = { windowId: "100", bundleId: "com.example.notes", x: -2, y: 5, width: 2, height: 2 };
  private static readonly STOP_ROOT: string = fs.mkdtempSync(path.join(tmpdir(), "noldova-computer-use-stops-"));
  public static readonly stopFolder: string = path.join(MacBackendHarness.STOP_ROOT, "stops");

  public static start(): MacBackendParts {
    return new MacBackendParts("/Applications/Host.app", MacBackendHarness.stopFolder);
  }

  public static removeStops(): void {
    fs.rmSync(MacBackendHarness.STOP_ROOT, { recursive: true, force: true });
  }

  public static async withBuiltinAsync(t: TestContext, replace: () => void, test: () => Promise<void>): Promise<void> {
    try {
      replace();
      syncBuiltinESMExports();
      await test();
    } finally {
      t.mock.restoreAll();
      syncBuiltinESMExports();
    }
  }

  public static stepsOf(from: DesktopPoint, to: DesktopPoint): readonly { readonly x: number; readonly y: number; readonly atMs: number }[] {
    return GlidePath.between(from, to).steps.map(t => ({ x: t.point.x, y: t.point.y, atMs: t.atMs }));
  }
}
