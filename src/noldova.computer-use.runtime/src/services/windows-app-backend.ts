/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { stat } from "node:fs/promises";
import path from "node:path";
import { setImmediate } from "node:timers/promises";

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import type { IWindowsProgramJson } from "../interfaces/i-windows-program-json.ts";
import { AppDescription } from "../models/backend/app-description.ts";
import { AppIdentity } from "../models/backend/app-identity.ts";
import { AppInfo } from "../models/backend/app-info.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { PngEncoder } from "./png-encoder.ts";

export class WindowsAppBackend implements IAppBackend {
  private readonly api: IWindowsDesktopApi;
  private readonly encoder: PngEncoder = new PngEncoder();
  private readonly programs: Map<string, IWindowsProgramJson> = new Map();

  public constructor(api: IWindowsDesktopApi) {
    this.api = api;
  }

  public async listAppsAsync(signal: AbortSignal): Promise<readonly AppInfo[]> {
    signal.throwIfAborted();
    const paths = this.api.listAppPaths();
    const host = WindowsAppBackend.identify(paths.host);
    const running = new Set(paths.running.map(t => WindowsAppBackend.identify(t)?.id));
    const apps = new Map<string, AppInfo>();
    for (const programPath of [...paths.running, ...paths.installed]) {
      const identity = WindowsAppBackend.identify(programPath);
      if (identity === null || apps.has(identity.id))
        continue;

      await setImmediate();
      signal.throwIfAborted();
      const program = this.describe(identity, programPath);
      const name = WindowsAppBackend.trimmed(program.description) ?? path.win32.parse(programPath).name;
      apps.set(identity.id, new AppInfo(identity, name, WindowsAppBackend.trimmed(program.signer), running.has(identity.id), identity.id === host?.id));
    }
    return [...apps.values()];
  }

  public async describeAppAsync(identity: AppIdentity, iconSize: number, signal: AbortSignal): Promise<AppDescription | null> {
    signal.throwIfAborted();
    if (!await WindowsAppBackend.isFileAsync(identity.id))
      return null;
    signal.throwIfAborted();
    const program = this.describe(identity, identity.id);
    const icon = await this.readIconAsync(identity.id, iconSize);
    signal.throwIfAborted();

    return new AppDescription(identity, WindowsAppBackend.trimmed(program.description) ?? path.win32.parse(identity.id).name, WindowsAppBackend.trimmed(program.signer), icon);
  }

  private static async isFileAsync(programPath: string): Promise<boolean> {
    try {
      return (await stat(programPath)).isFile();
    } catch (error) {
      if (!BackendFailures.isSystemError(error) && !BackendFailures.hasCode(error, Resources.invalidArgumentValueCode))
        throw error;

      return false;
    }
  }

  private static identify(programPath: string): AppIdentity | null {
    return AppIdentity.isWindowsPath(programPath) ? AppIdentity.ofWindowsPath(programPath) : null;
  }

  private static trimmed(text: string | null): string | null {
    const trimmed = text?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  }

  private describe(identity: AppIdentity, programPath: string): IWindowsProgramJson {
    let program = this.programs.get(identity.id);
    if (program === undefined) {
      program = this.api.describeProgram(programPath);
      this.programs.set(identity.id, program);
    }
    return program;
  }

  private async readIconAsync(programPath: string, size: number): Promise<Uint8Array | null> {
    try {
      const image = this.api.readProgramIcon(programPath, size);

      return image === null ? null : await this.encoder.encodeBgraWithAlphaAsync(image.width, image.height, new Uint8Array(image.bgra));
    } catch (error) {
      if (!BackendFailures.isBackendFailure(error))
        throw error;

      return null;
    }
  }
}
