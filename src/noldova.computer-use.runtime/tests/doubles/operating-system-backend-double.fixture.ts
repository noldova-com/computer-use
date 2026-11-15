/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IOperatingSystemBackend } from "@noldova/computer-use.runtime";

import type { AppBackendDouble } from "./app-backend-double.fixture.ts";
import { BorderBackendDouble } from "./border-backend-double.fixture.ts";
import type { CaptureBackendDouble } from "./capture-backend-double.fixture.ts";
import type { ControlBackendDouble } from "./control-backend-double.fixture.ts";
import type { DisplayBackendDouble } from "./display-backend-double.fixture.ts";
import type { InputBackendDouble } from "./input-backend-double.fixture.ts";
import type { PhysicalInputMonitorDouble } from "./physical-input-monitor-double.fixture.ts";
import type { WindowBackendDouble } from "./window-backend-double.fixture.ts";

export class OperatingSystemBackendDouble implements IOperatingSystemBackend {
  public readonly apps: AppBackendDouble;
  public readonly border: BorderBackendDouble = new BorderBackendDouble();
  public readonly capture: CaptureBackendDouble;
  public readonly controls: ControlBackendDouble;
  public readonly displays: DisplayBackendDouble;
  public readonly input: InputBackendDouble;
  public readonly physicalInput: PhysicalInputMonitorDouble;
  public readonly windows: WindowBackendDouble;

  public constructor(apps: AppBackendDouble, displays: DisplayBackendDouble, windows: WindowBackendDouble, capture: CaptureBackendDouble, controls: ControlBackendDouble, input: InputBackendDouble, physicalInput: PhysicalInputMonitorDouble) {
    this.apps = apps;
    this.displays = displays;
    this.windows = windows;
    this.capture = capture;
    this.controls = controls;
    this.input = input;
    this.physicalInput = physicalInput;
  }
}
