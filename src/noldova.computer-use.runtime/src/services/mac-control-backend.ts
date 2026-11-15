/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IControlBackend } from "../interfaces/backend/i-control-backend.ts";
import type { IMacControlJson } from "../interfaces/i-mac-control-json.ts";
import type { IMacTargetJson } from "../interfaces/i-mac-target-json.ts";
import { AppIdentity } from "../models/backend/app-identity.ts";
import { ControlInfo } from "../models/backend/control-info.ts";
import { ControlRole } from "../models/backend/control-role.ts";
import { ControlSpot } from "../models/backend/control-spot.ts";
import { ControlState } from "../models/backend/control-state.ts";
import { ControlTree } from "../models/backend/control-tree.ts";
import { DesktopPoint } from "../models/backend/desktop-point.ts";
import type { InputTarget } from "../models/backend/input-target.ts";
import { Resources } from "../resources.ts";
import { BackendAnswers } from "./backend-answers.ts";
import { ControlBounds } from "./control-bounds.ts";
import type { MacDesktopApi } from "./mac-desktop-api.ts";

export class MacControlBackend implements IControlBackend {
  private static readonly ROLES: ReadonlyMap<string, ControlRole> = new Map<string, ControlRole>([
    ...Resources.macWindowRoles.map(t => [t, ControlRole.Window] as const),
    ...Resources.macDialogRoles.map(t => [t, ControlRole.Dialog] as const),
    ...Resources.macPaneRoles.map(t => [t, ControlRole.Pane] as const),
    ...Resources.macMenuBarRoles.map(t => [t, ControlRole.MenuBar] as const),
    ...Resources.macMenuRoles.map(t => [t, ControlRole.Menu] as const),
    ...Resources.macMenuItemRoles.map(t => [t, ControlRole.MenuItem] as const),
    ...Resources.macToolbarRoles.map(t => [t, ControlRole.Toolbar] as const),
    ...Resources.macButtonRoles.map(t => [t, ControlRole.Button] as const),
    ...Resources.macComboBoxRoles.map(t => [t, ControlRole.ComboBox] as const),
    ...Resources.macCheckBoxRoles.map(t => [t, ControlRole.CheckBox] as const),
    ...Resources.macRadioRoles.map(t => [t, ControlRole.Radio] as const),
    ...Resources.macEditRoles.map(t => [t, ControlRole.Edit] as const),
    ...Resources.macTextRoles.map(t => [t, ControlRole.Text] as const),
    ...Resources.macLinkRoles.map(t => [t, ControlRole.Link] as const),
    ...Resources.macImageRoles.map(t => [t, ControlRole.Image] as const),
    ...Resources.macListRoles.map(t => [t, ControlRole.List] as const),
    ...Resources.macTableRoles.map(t => [t, ControlRole.Table] as const),
    ...Resources.macTreeRoles.map(t => [t, ControlRole.Tree] as const),
    ...Resources.macRowRoles.map(t => [t, ControlRole.Row] as const),
    ...Resources.macCellRoles.map(t => [t, ControlRole.Cell] as const),
    ...Resources.macHeaderRoles.map(t => [t, ControlRole.Header] as const),
    ...Resources.macTabListRoles.map(t => [t, ControlRole.TabList] as const),
    ...Resources.macSliderRoles.map(t => [t, ControlRole.Slider] as const),
    ...Resources.macProgressBarRoles.map(t => [t, ControlRole.ProgressBar] as const),
    ...Resources.macScrollBarRoles.map(t => [t, ControlRole.ScrollBar] as const),
    ...Resources.macGroupRoles.map(t => [t, ControlRole.Group] as const),
    ...Resources.macDocumentRoles.map(t => [t, ControlRole.Document] as const)
  ]);
  private static readonly SUBROLES: ReadonlyMap<string, ControlRole> = new Map<string, ControlRole>([
    ...Resources.macDialogSubroles.map(t => [t, ControlRole.Dialog] as const),
    ...Resources.macTabSubroles.map(t => [t, ControlRole.Tab] as const),
    ...Resources.macCheckBoxSubroles.map(t => [t, ControlRole.CheckBox] as const),
    ...Resources.macTreeItemSubroles.map(t => [t, ControlRole.TreeItem] as const)
  ]);
  private readonly api: MacDesktopApi;

  public constructor(api: MacDesktopApi) {
    this.api = api;
  }

  public async readControlsAsync(target: InputTarget, underHandle: string | null, signal: AbortSignal): Promise<ControlTree> {
    signal.throwIfAborted();
    const bounds = new ControlBounds();
    const controls: ControlInfo[] = [];
    const answer = Resources.macScriptMethods.readControls;
    let slice = await this.api.readControlsAsync(MacControlBackend.toTarget(target), underHandle, Resources.controlReadTimeoutMs);
    for (;;) {
      signal.throwIfAborted();
      const read = slice;
      controls.push(...read.controls.map(t => BackendAnswers.read(answer, t, () => new ControlInfo(t.handle, t.parentHandle, AppIdentity.ofMacBundleId(t.bundleId),
        MacControlBackend.roleOf(t.role, t.subrole), t.name, t.value, MacControlBackend.statesOf(t), bounds.cut(t.handle, t.parentHandle, t)))));
      if (read.isDone)
        return BackendAnswers.read(answer, read, () => new ControlTree(controls, read.leftOut, read.timedOut));
      slice = await this.api.continueControlsAsync(read.read);
    }
  }

  public async findControlAsync(_target: InputTarget, handle: string, signal: AbortSignal): Promise<ControlSpot | null> {
    signal.throwIfAborted();
    const spot = await this.api.findControlAsync(handle);
    signal.throwIfAborted();
    if (spot === null)
      return null;

    return BackendAnswers.read(Resources.macScriptMethods.findControl, spot, () => new ControlSpot(MacControlBackend.roleOf(spot.role, spot.subrole), spot.name, spot.isEnabled,
      spot.width > 0 && spot.height > 0, new DesktopPoint(spot.x + Math.floor(spot.width / 2), spot.y + Math.floor(spot.height / 2))));
  }

  public async isControlAtAsync(_target: InputTarget, handle: string, at: DesktopPoint, signal: AbortSignal): Promise<boolean> {
    signal.throwIfAborted();
    const isHit = await this.api.hitsControlAsync(handle, at.x, at.y, Resources.controlSearchTimeoutMs);
    signal.throwIfAborted();

    return isHit;
  }

  private static roleOf(role: string, subrole: string): ControlRole {
    return MacControlBackend.SUBROLES.get(subrole) ?? MacControlBackend.ROLES.get(role) ?? ControlRole.Other;
  }

  private static statesOf(control: IMacControlJson): readonly ControlState[] {
    const held: readonly (readonly [boolean, ControlState])[] = [
      [control.isFocused, ControlState.Focused],
      [!control.isEnabled, ControlState.Disabled],
      [control.checkState === Resources.macCheckedValue, ControlState.Checked],
      [control.checkState === Resources.macMixedValue, ControlState.Mixed],
      [control.isSelected, ControlState.Selected],
      [control.isExpanded === true, ControlState.Expanded],
      [control.isExpanded === false, ControlState.Collapsed],
      [control.subrole === Resources.macSecureSubrole, ControlState.Password]
    ];

    return held.filter(([holds]) => holds).map(([, state]) => state);
  }

  private static toTarget(target: InputTarget): IMacTargetJson {
    return { windowId: target.windowId, processId: target.processId, bundleId: target.app.id };
  }
}
