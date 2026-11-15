/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IAppBackend } from "../interfaces/backend/i-app-backend.ts";
import type { IBorderBackend } from "../interfaces/backend/i-border-backend.ts";
import type { ICaptureBackend } from "../interfaces/backend/i-capture-backend.ts";
import type { IControlBackend } from "../interfaces/backend/i-control-backend.ts";
import type { IInputBackend } from "../interfaces/backend/i-input-backend.ts";
import type { IOperatingSystemBackend } from "../interfaces/backend/i-operating-system-backend.ts";
import type { IPhysicalInputMonitor } from "../interfaces/backend/i-physical-input-monitor.ts";
import type { IWindowBackend } from "../interfaces/backend/i-window-backend.ts";
import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import type { IWindowsDesktopApi } from "../interfaces/i-windows-desktop-api.ts";
import { Resources } from "../resources.ts";
import { WindowsAppBackend } from "./windows-app-backend.ts";
import { WindowsBorderBackend } from "./windows-border-backend.ts";
import { WindowsCaptureBackend } from "./windows-capture-backend.ts";
import { WindowsControlBackend } from "./windows-control-backend.ts";
import { WindowsDesktopApi } from "./windows-desktop-api.ts";
import { WindowsDisplayBackend } from "./windows-display-backend.ts";
import { WindowsInputBackend } from "./windows-input-backend.ts";
import { WindowsPhysicalInputMonitor } from "./windows-physical-input-monitor.ts";
import { WindowsWindowBackend } from "./windows-window-backend.ts";

export class WindowsBackend implements IOperatingSystemBackend {
  public static readonly addonFile: string = WindowsDesktopApi.addonFile;
  public readonly apps: IAppBackend;
  public readonly border: IBorderBackend;
  public readonly capture: ICaptureBackend;
  public readonly controls: IControlBackend;
  public readonly displays: IDisplayBackend;
  public readonly input: IInputBackend;
  public readonly physicalInput: IPhysicalInputMonitor;
  public readonly windows: IWindowBackend;

  public constructor(api: IWindowsDesktopApi) {
    this.apps = new WindowsAppBackend(api);
    this.border = new WindowsBorderBackend(api);
    this.capture = new WindowsCaptureBackend(api);
    this.controls = new WindowsControlBackend(api);
    this.displays = new WindowsDisplayBackend(api);
    this.input = new WindowsInputBackend(api, Resources.windowsFocusMs);
    this.physicalInput = new WindowsPhysicalInputMonitor(api, Resources.windowsHeartbeatIntervalMs, () => Date.now());
    this.windows = new WindowsWindowBackend(api);
  }

  public static load(addonFile: string = WindowsBackend.addonFile): WindowsBackend {
    return new WindowsBackend(new WindowsDesktopApi(addonFile));
  }
}
