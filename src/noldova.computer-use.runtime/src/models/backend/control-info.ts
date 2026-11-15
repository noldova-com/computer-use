/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { AppIdentity } from "./app-identity.ts";
import type { ControlRole } from "./control-role.ts";
import { ControlState } from "./control-state.ts";
import type { DesktopRect } from "./desktop-rect.ts";

export class ControlInfo {
  public readonly app: AppIdentity;
  public readonly bounds: DesktopRect | null;
  public readonly handle: string;
  public readonly name: string;
  public readonly parentHandle: string | null;
  public readonly role: ControlRole;
  public readonly states: readonly ControlState[];
  public readonly value: string | null;

  public constructor(handle: string, parentHandle: string | null, app: AppIdentity, role: ControlRole, name: string, value: string | null, states: readonly ControlState[], bounds: DesktopRect | null) {
    if (handle === "")
      throw new ArgumentOutOfRangeException(Resources.handleParameterName, handle, Resources.emptyControlHandle);
    if (parentHandle === "")
      throw new ArgumentOutOfRangeException(Resources.parentHandleParameterName, parentHandle, Resources.emptyControlHandle);
    if (value !== null && states.includes(ControlState.Password))
      throw new ArgumentException(Resources.passwordValueRead, Resources.valueParameterName);

    this.app = app;
    this.bounds = bounds;
    this.handle = handle;
    this.name = name;
    this.parentHandle = parentHandle;
    this.role = role;
    this.states = states;
    this.value = value;
  }

  public get isSilentContainer(): boolean {
    return this.role.isContainer && this.name === "" && this.value === null;
  }
}
