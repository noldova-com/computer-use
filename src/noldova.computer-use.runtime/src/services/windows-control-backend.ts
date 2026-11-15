/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IControlBackend } from "../interfaces/backend/i-control-backend.ts";
import type { IWindowsControlJson } from "../interfaces/i-windows-control-json.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import type { IWindowsTargetJson } from "../interfaces/i-windows-target-json.ts";
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

export class WindowsControlBackend implements IControlBackend {
  private static readonly ROLES: ReadonlyMap<number, ControlRole> = new Map<number, ControlRole>([
    ...Resources.windowsButtonControlTypes.map(t => [t, ControlRole.Button] as const),
    ...Resources.windowsOtherControlTypes.map(t => [t, ControlRole.Other] as const),
    ...Resources.windowsCheckBoxControlTypes.map(t => [t, ControlRole.CheckBox] as const),
    ...Resources.windowsComboBoxControlTypes.map(t => [t, ControlRole.ComboBox] as const),
    ...Resources.windowsEditControlTypes.map(t => [t, ControlRole.Edit] as const),
    ...Resources.windowsLinkControlTypes.map(t => [t, ControlRole.Link] as const),
    ...Resources.windowsImageControlTypes.map(t => [t, ControlRole.Image] as const),
    ...Resources.windowsListItemControlTypes.map(t => [t, ControlRole.ListItem] as const),
    ...Resources.windowsListControlTypes.map(t => [t, ControlRole.List] as const),
    ...Resources.windowsMenuControlTypes.map(t => [t, ControlRole.Menu] as const),
    ...Resources.windowsMenuBarControlTypes.map(t => [t, ControlRole.MenuBar] as const),
    ...Resources.windowsMenuItemControlTypes.map(t => [t, ControlRole.MenuItem] as const),
    ...Resources.windowsProgressBarControlTypes.map(t => [t, ControlRole.ProgressBar] as const),
    ...Resources.windowsRadioControlTypes.map(t => [t, ControlRole.Radio] as const),
    ...Resources.windowsScrollBarControlTypes.map(t => [t, ControlRole.ScrollBar] as const),
    ...Resources.windowsSliderControlTypes.map(t => [t, ControlRole.Slider] as const),
    ...Resources.windowsGroupControlTypes.map(t => [t, ControlRole.Group] as const),
    ...Resources.windowsTabListControlTypes.map(t => [t, ControlRole.TabList] as const),
    ...Resources.windowsTabControlTypes.map(t => [t, ControlRole.Tab] as const),
    ...Resources.windowsTextControlTypes.map(t => [t, ControlRole.Text] as const),
    ...Resources.windowsToolbarControlTypes.map(t => [t, ControlRole.Toolbar] as const),
    ...Resources.windowsTreeControlTypes.map(t => [t, ControlRole.Tree] as const),
    ...Resources.windowsTreeItemControlTypes.map(t => [t, ControlRole.TreeItem] as const),
    ...Resources.windowsTableControlTypes.map(t => [t, ControlRole.Table] as const),
    ...Resources.windowsRowControlTypes.map(t => [t, ControlRole.Row] as const),
    ...Resources.windowsDocumentControlTypes.map(t => [t, ControlRole.Document] as const),
    ...Resources.windowsWindowControlTypes.map(t => [t, ControlRole.Window] as const),
    ...Resources.windowsPaneControlTypes.map(t => [t, ControlRole.Pane] as const),
    ...Resources.windowsHeaderControlTypes.map(t => [t, ControlRole.Header] as const)
  ]);
  private readonly api: IWindowsDesktopApi;

  public constructor(api: IWindowsDesktopApi) {
    this.api = api;
  }

  public async readControlsAsync(target: InputTarget, underHandle: string | null, signal: AbortSignal): Promise<ControlTree> {
    signal.throwIfAborted();
    const tree = await WindowsControlBackend.answerAsync(this.api.readControls(WindowsControlBackend.toTarget(target), underHandle, Resources.controlReadTimeoutMs), signal);
    const bounds = new ControlBounds();
    const answer = Resources.windowsReadControlsAnswer;
    const controls = tree.controls.map(t => BackendAnswers.read(answer, t, () => new ControlInfo(t.handle, t.parentHandle, AppIdentity.ofWindowsPath(t.imagePath),
      WindowsControlBackend.roleOf(t.controlType), t.name, t.value, WindowsControlBackend.statesOf(t), bounds.cut(t.handle, t.parentHandle, t))));

    return BackendAnswers.read(answer, tree, () => new ControlTree(controls, tree.leftOut, tree.timedOut));
  }

  public async findControlAsync(target: InputTarget, handle: string, signal: AbortSignal): Promise<ControlSpot | null> {
    signal.throwIfAborted();
    const spot = await WindowsControlBackend.answerAsync(this.api.findControl(WindowsControlBackend.toTarget(target), handle, Resources.controlSearchTimeoutMs), signal);
    if (spot === null)
      return null;

    return BackendAnswers.read(Resources.windowsFindControlAnswer, spot,
      () => new ControlSpot(WindowsControlBackend.roleOf(spot.controlType), spot.name, spot.isEnabled, !spot.isOffscreen, new DesktopPoint(spot.x, spot.y)));
  }

  public async isControlAtAsync(target: InputTarget, handle: string, at: DesktopPoint, signal: AbortSignal): Promise<boolean> {
    signal.throwIfAborted();

    return await WindowsControlBackend.answerAsync(this.api.hitsControl(WindowsControlBackend.toTarget(target), handle, at.x, at.y, Resources.controlSearchTimeoutMs), signal);
  }

  private static async answerAsync<T>(call: Promise<T>, signal: AbortSignal): Promise<T> {
    const ended = Promise.withResolvers<never>();
    const end = (): void => ended.reject(signal.reason);
    signal.addEventListener("abort", end, { once: true });
    try {
      return await Promise.race([call, ended.promise]);
    } finally {
      signal.removeEventListener("abort", end);
    }
  }

  private static roleOf(controlType: number): ControlRole {
    return WindowsControlBackend.ROLES.get(controlType) ?? ControlRole.Other;
  }

  private static statesOf(control: IWindowsControlJson): readonly ControlState[] {
    const isRadio = WindowsControlBackend.roleOf(control.controlType) === ControlRole.Radio;
    const held: readonly (readonly [boolean, ControlState])[] = [
      [control.hasFocus, ControlState.Focused],
      [!control.isEnabled, ControlState.Disabled],
      [control.isReadOnly, ControlState.ReadOnly],
      [control.toggleState === Resources.windowsToggleOn || (isRadio && control.isSelected), ControlState.Checked],
      [control.toggleState === Resources.windowsToggleIndeterminate, ControlState.Mixed],
      [!isRadio && control.isSelected, ControlState.Selected],
      [control.expandState === Resources.windowsExpanded || control.expandState === Resources.windowsPartiallyExpanded, ControlState.Expanded],
      [control.expandState === Resources.windowsCollapsed, ControlState.Collapsed],
      [control.isPassword, ControlState.Password]
    ];

    return held.filter(([holds]) => holds).map(([, state]) => state);
  }

  private static toTarget(target: InputTarget): IWindowsTargetJson {
    return { windowId: target.windowId, processId: target.processId, imagePath: target.app.id };
  }
}
