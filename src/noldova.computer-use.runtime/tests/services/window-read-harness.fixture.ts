/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";

import { type AppIdentity, ControlInfo, ControlRole, ControlState, ControlTree, DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";
import { ToolContentKind, type ToolResult } from "@noldova/desktop.runtime";

import type { IPermissionIntercept } from "../doubles/interfaces/i-permission-intercept.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";
import { WindowRead } from "./window-read.fixture.ts";

export class WindowReadHarness {
  public static readonly notes: AppIdentity = RuntimeHarness.notes.identity;
  public static readonly window: WindowInfo = new WindowInfo(WindowReadHarness.notes, "Notes", "100", 42, new DesktopRect(0, 0, 8, 6), false);
  public static readonly frame: object = { id: "1", display: "display-1", width: 8, height: 6, scale: 1 };
  public static readonly notesWindow: object = { app: "Notes", identity: WindowReadHarness.notes.id };

  public static readonly tree: ControlTree = new ControlTree([
    new ControlInfo("m", null, WindowReadHarness.notes, ControlRole.MenuBar, "Application", null, [], null),
    new ControlInfo("p", null, WindowReadHarness.notes, ControlRole.Pane, "", null, [], new DesktopRect(0, 1, 8, 5)),
    new ControlInfo("b", null, WindowReadHarness.notes, ControlRole.Button, "Save", null, [ControlState.Disabled], new DesktopRect(6, 5, 2, 1)),
    new ControlInfo("f", "m", WindowReadHarness.notes, ControlRole.MenuItem, "File", null, [], new DesktopRect(1, 0, 2, 1)),
    new ControlInfo("e", "p", WindowReadHarness.notes, ControlRole.Edit, "Text", "Dear \"team\",\nhello", [ControlState.Focused], new DesktopRect(0, 1, 8, 4)),
    new ControlInfo("w", "p", WindowReadHarness.notes, ControlRole.Edit, "Password", null, [ControlState.Password], new DesktopRect(0, 5, 3, 1))
  ], 0, false);

  public static async readyAsync(intercept: IPermissionIntercept | null = null): Promise<RuntimeHarness> {
    const harness = await RuntimeHarness.startAsync(undefined, undefined, intercept);
    harness.backend.displays.displays = [ScreenImages.primary, ScreenImages.left];
    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 8, 6), 8, 6));
    harness.backend.capture.set(ScreenImages.captureOf("display-2", new DesktopRect(-8, 0, 8, 6), 16, 12));
    await harness.grantAppAsync(RuntimeHarness.notes);
    harness.windows.foreground = WindowReadHarness.window;
    harness.backend.controls.set(null, WindowReadHarness.tree);

    return harness;
  }

  public static readOf(result: ToolResult): WindowRead {
    assert.equal(result.structured, null);
    assert.equal(result.content.length, 2);
    const [facts, listing] = result.content;
    assert.ok(facts !== undefined && listing !== undefined);
    assert.equal(facts.kind, ToolContentKind.Text);
    assert.equal(facts.isUntrusted, false);
    assert.equal(listing.kind, ToolContentKind.Text);
    assert.equal(listing.origin, "computer-use:window");
    assert.equal(listing.isUntrusted, true);

    const parsed: unknown = JSON.parse(facts.value);

    return new WindowRead(parsed, listing.value);
  }

  public static buttons(count: number, name: string): ControlTree {
    return new ControlTree(Array.from({ length: count }, (_, index) => new ControlInfo(`b${index}`, null, WindowReadHarness.notes, ControlRole.Button, name, null, [], new DesktopRect(0, 0, 1, 1))), 0, false);
  }
}
