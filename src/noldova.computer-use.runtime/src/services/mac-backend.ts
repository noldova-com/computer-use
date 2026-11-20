/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type IModuleLog, PackagedPath } from "@noldova/desktop.runtime";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IBorderBackend } from "../interfaces/backend/i-border-backend.ts";
import type { ICaptureBackend } from "../interfaces/backend/i-capture-backend.ts";
import type { IControlBackend } from "../interfaces/backend/i-control-backend.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IOperatingSystemBackend } from "../interfaces/backend/i-operating-system-backend.ts";
import type { IPhysicalInputMonitor } from "../interfaces/backend/i-physical-input-monitor.ts";
import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import type { IMacScreenCapturer } from "../interfaces/i-mac-screen-capturer.ts";
import type { IMacScriptChannel } from "../interfaces/i-mac-script-channel.ts";
import type { IMacSignatureReader } from "../interfaces/i-mac-signature-reader.ts";
import type { IProgramStarter } from "../interfaces/i-program-starter.ts";
import { Resources } from "../resources.ts";
import { MacAppBackend } from "./mac-app-backend.ts";
import { MacBorderBackend } from "./mac-border-backend.ts";
import { MacCaptureBackend } from "./mac-capture-backend.ts";
import { MacControlBackend } from "./mac-control-backend.ts";
import { MacCodeSignProgram } from "./mac-code-sign-program.ts";
import { MacDesktopApi } from "./mac-desktop-api.ts";
import { MacDisplayBackend } from "./mac-display-backend.ts";
import { MacInputBackend } from "./mac-input-backend.ts";
import { MacPhysicalInputMonitor } from "./mac-physical-input-monitor.ts";
import { MacScreenCaptureProgram } from "./mac-screen-capture-program.ts";
import { MacScriptProcess } from "./mac-script-process.ts";
import { MacWindowBackend } from "./mac-window-backend.ts";
import { PngDecoder } from "./png-decoder.ts";

export class MacBackend implements IOperatingSystemBackend {
  public static readonly scriptFile: string = MacBackend.scriptFileOf(import.meta.url);
  public readonly apps: IAppBackend;
  public readonly border: IBorderBackend;
  public readonly capture: ICaptureBackend;
  public readonly controls: IControlBackend;
  public readonly displays: IDisplayBackend;
  public readonly input: IInputBackend;
  public readonly physicalInput: IPhysicalInputMonitor;
  public readonly windows: IWindowBackend;
  private readonly channel: IMacScriptChannel;
  private readonly macInput: MacInputBackend;

  public constructor(channel: IMacScriptChannel, capturer: IMacScreenCapturer, signatures: IMacSignatureReader, hostPath: string, stopFolder: string, log: IModuleLog) {
    const api = new MacDesktopApi(channel);
    this.apps = new MacAppBackend(api, signatures, hostPath);
    this.border = new MacBorderBackend(api);
    this.capture = new MacCaptureBackend(api, capturer, new PngDecoder());
    this.controls = new MacControlBackend(api);
    this.channel = channel;
    this.displays = new MacDisplayBackend(api);
    this.macInput = new MacInputBackend(api, stopFolder, log);
    this.input = this.macInput;
    this.physicalInput = new MacPhysicalInputMonitor(api, Resources.macHeartbeatIntervalMs, () => Date.now(), log);
    this.windows = new MacWindowBackend(api);
  }

  public static load(starter: IProgramStarter): MacBackend {
    const channel = new MacScriptProcess(starter, Resources.macScriptProgram, [...Resources.macScriptParameters, MacBackend.scriptFile], Resources.macCallTimeoutMs);
    const capturer = new MacScreenCaptureProgram(starter, Resources.macCaptureProgram, [], Resources.macCallTimeoutMs, path.join(tmpdir(), Resources.macCaptureFolderName));

    const signatures = new MacCodeSignProgram(starter, Resources.macCodeSignProgram, [], Resources.macCallTimeoutMs);

    return new MacBackend(channel, capturer, signatures, MacBackend.hostPathOf(process.execPath), path.join(tmpdir(), Resources.macStopFolderName), starter.log);
  }

  public static scriptFileOf(moduleUrl: string): string {
    return PackagedPath.unpacked(fileURLToPath(new URL(Resources.macScriptPath, moduleUrl)));
  }

  public static hostPathOf(executable: string): string {
    return Resources.macAppBundlePattern.exec(executable)?.[1] ?? "";
  }

  public async closeAsync(): Promise<void> {
    await this.macInput.endDragsAsync();
    await this.channel.closeAsync();
  }
}
