/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IDisplayBackend } from "../i-display-backend.ts";
import type { IAppBackend } from "./i-app-backend.ts";
import type { IBorderBackend } from "./i-border-backend.ts";
import type { ICaptureBackend } from "./i-capture-backend.ts";
import type { IControlBackend } from "./i-control-backend.ts";
import type { IInputBackend } from "./i-input-backend.ts";
import type { IPhysicalInputMonitor } from "./i-physical-input-monitor.ts";
import type { IWindowBackend } from "./i-window-backend.ts";

export interface IOperatingSystemBackend {
  readonly apps: IAppBackend;
  readonly displays: IDisplayBackend;
  readonly windows: IWindowBackend;
  readonly capture: ICaptureBackend;
  readonly controls: IControlBackend;
  readonly input: IInputBackend;
  readonly physicalInput: IPhysicalInputMonitor;
  readonly border: IBorderBackend;
}
