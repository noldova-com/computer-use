/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ControlStateUnknownException } from "../exceptions/control-state-unknown.exception.ts";

export class ControlState {
  public static readonly Idle: ControlState = new ControlState("Idle", false);
  public static readonly Controlling: ControlState = new ControlState("Controlling", true);
  public static readonly Stopped: ControlState = new ControlState("Stopped", false);
  private static readonly ALL: readonly ControlState[] = [ControlState.Idle, ControlState.Controlling, ControlState.Stopped];
  public readonly isControlling: boolean;
  public readonly value: string;

  private constructor(value: string, isControlling: boolean) {
    this.isControlling = isControlling;
    this.value = value;
  }

  public static fromJson(value: unknown): ControlState {
    const state = ControlState.ALL.find(t => t.value === value);
    if (state === undefined)
      throw new ControlStateUnknownException(value);
    return state;
  }

  public toJson(): string {
    return this.value;
  }
}
