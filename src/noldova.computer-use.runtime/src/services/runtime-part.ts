/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { BorderColorSetRequest, ControlState, SessionStatus, StatusReadRequest, StopRequest } from "@noldova/computer-use.protocol";
import { type IRuntimePart, type IRuntimePartContext, type IToolDescriptor, type Registration, ToolAbortReason } from "@noldova/desktop.runtime";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IOperatingSystemBackend } from "../interfaces/backend/i-operating-system-backend.ts";
import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { IProgramStarter } from "../interfaces/i-program-starter.ts";
import { GrantRecord } from "../models/grant-record.ts";
import { InputKind } from "../models/input-kind.ts";
import { Resources } from "../resources.ts";
import { ActionQueue } from "./action-queue.ts";
import { AppClassifier } from "./app-classifier.ts";
import { AppWindowGuard } from "./app-window-guard.ts";
import { AppsService } from "./apps-service.ts";
import { BatchTool } from "./batch-tool.ts";
import { ClickTool } from "./click-tool.ts";
import { ControlSwitch } from "./control-switch.ts";
import { ControlledTool } from "./controlled-tool.ts";
import { DisplayBorder } from "./display-border.ts";
import { DragTool } from "./drag-tool.ts";
import { ForegroundInput } from "./foreground-input.ts";
import { KeyTool } from "./key-tool.ts";
import { KitAccent } from "./kit-accent.ts";
import { ListAppsTool } from "./list-apps-tool.ts";
import { ListDisplaysTool } from "./list-displays-tool.ts";
import { MacBackend } from "./mac-backend.ts";
import { MoveTool } from "./move-tool.ts";
import { PngEncoder } from "./png-encoder.ts";
import { ReadWindowTool } from "./read-window-tool.ts";
import { RememberedGrants } from "./remembered-grants.ts";
import { RequestAppsTool } from "./request-apps-tool.ts";
import { ScreenFrames } from "./screen-frames.ts";
import { ScreenImager } from "./screen-imager.ts";
import { ScreenPoints } from "./screen-points.ts";
import { ScreenSessionGate } from "./screen-session-gate.ts";
import { ScreenshotTool } from "./screenshot-tool.ts";
import { ScrollTool } from "./scroll-tool.ts";
import { TierPolicy } from "./tier-policy.ts";
import { TypeTool } from "./type-tool.ts";
import { WindowReadings } from "./window-readings.ts";
import { WindowsBackend } from "./windows-backend.ts";
import { ZoomTool } from "./zoom-tool.ts";

export class RuntimePart implements IRuntimePart {
  private apps: IAppBackend | null = null;
  private border: DisplayBorder | null = null;
  private borderColor: string | null = null;
  private readonly loadBackend: (starter: IProgramStarter) => IOperatingSystemBackend;
  private control: ControlSwitch | null = null;
  private readonly kitAccentFile: string;
  private lifetime: AbortController = new AbortController();
  private readonly registrations: Registration[] = [];

  public constructor(
    loadBackend: (starter: IProgramStarter) => IOperatingSystemBackend = t => RuntimePart.loadPlatformBackend(t, process.platform),
    kitAccentFile: string = KitAccent.file
  ) {
    this.loadBackend = loadBackend;
    this.kitAccentFile = kitAccentFile;
  }

  public async activateAsync(context: IRuntimePartContext): Promise<void> {
    context.registerMethod(StopRequest.method, {
      handleAsync: async t => {
        StopRequest.fromJson(t.payload);
        this.control?.stop(Resources.stopByPane);

        return {};
      }
    });
    context.registerMethod(StatusReadRequest.method, {
      handleAsync: async t => {
        StatusReadRequest.fromJson(t.payload);

        return (this.control?.currentStatus ?? new SessionStatus(ControlState.Idle, null)).toJson();
      }
    });
    context.registerMethod(BorderColorSetRequest.method, {
      handleAsync: async t => {
        const request = BorderColorSetRequest.fromJson(t.payload);
        this.borderColor = request.color;
        this.border?.setColor(request.color);

        return {};
      }
    });
    context.publishService(Resources.appsServiceName, new AppsService(() => this.apps, t => context.log.write(t)));
    try {
      await this.startAsync(context);
    } catch (error) {
      await this.endAsync();
      throw error;
    }
  }

  public async deactivateAsync(): Promise<void> {
    await this.endAsync();
  }

  public static loadPlatformBackend(starter: IProgramStarter, platform: string): IOperatingSystemBackend {
    return platform === Resources.windowsPlatform ? WindowsBackend.load() : MacBackend.load(starter);
  }

  private async startAsync(context: IRuntimePartContext): Promise<void> {
    const backend = this.loadBackend(context);
    this.lifetime = new AbortController();
    const gate = new ScreenSessionGate();
    const color = this.borderColor ?? await KitAccent.readAsync(this.kitAccentFile, t => context.log.write(t));
    const border = new DisplayBorder(backend.border, backend.displays, () => context.settings.read(Resources.showBorderSetting) !== false,
      color, t => context.log.write(t));
    this.border = border;
    context.settings.onChanged(Resources.showBorderSetting, () => border.update());
    const control = new ControlSwitch(context, backend.physicalInput, t => border.follow(t.state));
    this.control = control;
    const queue = new ActionQueue();
    const record = new GrantRecord();
    const policy = new TierPolicy(new AppClassifier());
    const frames = new ScreenFrames();
    const readings = new WindowReadings();
    const grants = new RememberedGrants();
    const imager = new ScreenImager(backend.displays, backend.windows, backend.capture, new PngEncoder(), record, grants);
    const register = (descriptor: IToolDescriptor, tool: IComputerTool): void => {
      this.registrations.push(context.tools.register(descriptor, new ControlledTool(descriptor.name, tool, gate, queue, control, this.lifetime.signal)));
    };

    register(ListDisplaysTool.descriptor, new ListDisplaysTool(backend.displays));
    register(ListAppsTool.descriptor, new ListAppsTool(backend.apps, policy, record));
    register(RequestAppsTool.descriptor, new RequestAppsTool(backend.apps, policy, record));
    register(ScreenshotTool.descriptor, new ScreenshotTool(imager, frames));
    register(ZoomTool.descriptor, new ZoomTool(imager, frames));

    const foreground = new ForegroundInput(new AppWindowGuard(backend.windows, context.appWindows), record, grants, control);
    register(ReadWindowTool.descriptor, new ReadWindowTool(foreground, imager, frames, readings, backend.controls));

    const points = new ScreenPoints(frames, readings, backend.capture, backend.input, backend.controls);
    const click = new ClickTool(foreground, points, backend.input);
    const scroll = new ScrollTool(foreground, points, backend.input);
    const move = new MoveTool(foreground, points, backend.input);
    const drag = new DragTool(foreground, points, backend.input);
    const typing = new TypeTool(foreground, backend.input);
    const key = new KeyTool(foreground, backend.input, context.shortcuts);
    register(ClickTool.descriptor, click);
    register(ScrollTool.descriptor, scroll);
    register(MoveTool.descriptor, move);
    register(DragTool.descriptor, drag);
    register(TypeTool.descriptor, typing);
    register(KeyTool.descriptor, key);

    const listed = new Map<InputKind, IComputerTool>([
      [InputKind.Click, click],
      [InputKind.Scroll, scroll],
      [InputKind.Move, move],
      [InputKind.Drag, drag],
      [InputKind.Type, typing],
      [InputKind.Key, key]
    ]);
    register(BatchTool.descriptor, new BatchTool(foreground, backend.input, context.shortcuts, listed));

    this.registrations.push(context.tools.onSessionEnded(t => {
      gate.endSession(t);
      control.endSession(t);
      record.removeSession(t);
      frames.endSession(t);
      readings.endSession(t);
    }));
    this.apps = backend.apps;
  }

  private async endAsync(): Promise<void> {
    this.apps = null;
    this.lifetime.abort(ToolAbortReason.SwitchedOff);
    for (const registration of this.registrations.splice(0).reverse())
      registration[Symbol.dispose]();

    const control = this.control;
    this.control = null;
    await control?.disposeAsync();
    const border = this.border;
    this.border = null;
    await border?.disposeAsync();
    border?.cancel();
  }
}
