/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SessionStatus, StatusReadRequest } from "@noldova/computer-use.protocol";
import {
  CommandContribution,
  type IWindowPart,
  type IWindowPartContext,
  type StatusBarItem,
  StatusBarItemContribution,
  StatusBarItemState,
  StatusBarSide
} from "@noldova/desktop.window";

import { ControlStatus } from "../models/control-status.ts";
import { Resources } from "../resources.ts";
import { SessionStatusFeed } from "./session-status-feed.ts";
import { StopControl } from "./stop-control.ts";

export class ComputerUseWindowPart implements IWindowPart {
  public readonly moduleId: string = Resources.moduleId;
  private readonly hidden: StatusBarItemState = new StatusBarItemState(Resources.statusText, { isHidden: true });
  private readonly shown: StatusBarItemState = new StatusBarItemState(Resources.statusText,
    { icon: Resources.statusGlyph, tooltip: Resources.statusTooltip, command: Resources.stopCommand });
  private canStop: boolean = false;
  private changesSeen: number = 0;
  private context: IWindowPartContext | null = null;
  private item: StatusBarItem | null = null;
  private unsubscribe: (() => void) | null = null;

  public async activateAsync(context: IWindowPartContext): Promise<void> {
    const stop = new StopControl(context);
    this.context = context;
    context.registerCommand(new CommandContribution(Resources.stopCommand, Resources.stopTitle, Resources.statusGlyph, null, async () => {
      await stop.stopAsync();

      return null;
    }, () => this.canStop));
    this.item = context.registerStatusBarItem(new StatusBarItemContribution(Resources.statusItem, StatusBarSide.Right, this.hidden));
    this.unsubscribe = new SessionStatusFeed(context).subscribe(t => {
      this.changesSeen++;
      this.show(t);
    });
    await this.readAsync(context);
  }

  public async reconnectAsync(): Promise<boolean> {
    if (this.context === null)
      return false;

    await this.readAsync(this.context);

    return true;
  }

  public async deactivateAsync(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.show(null);
    this.item = null;
    this.context = null;
  }

  private async readAsync(context: IWindowPartContext): Promise<void> {
    const changesBeforeRead = this.changesSeen;
    const status = SessionStatus.fromJson(await context.requestAsync(StatusReadRequest.method, new StatusReadRequest().toJson()));
    if (this.changesSeen === changesBeforeRead)
      this.show(new ControlStatus(status));
  }

  private show(status: ControlStatus | null): void {
    this.canStop = status?.canStop === true;
    this.item?.update(this.canStop ? this.shown : this.hidden);
  }
}
