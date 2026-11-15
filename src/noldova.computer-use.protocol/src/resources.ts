/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class Resources {
  public static readonly borderColorSetMethod: string = "computer-use.borderColorSet";
  public static readonly borderColorSetRequestModel: string = "BorderColorSetRequest";
  public static readonly colorField: string = "color";
  public static readonly emptySessionId: string = "A session ID must not be empty.";
  public static readonly fieldPathSeparator: string = ".";
  public static readonly hexColorPattern: RegExp = /^#[0-9A-Fa-f]{6}$/;
  public static readonly sessionIdField: string = "sessionId";
  public static readonly sessionStatusModel: string = "SessionStatus";
  public static readonly stateField: string = "state";
  public static readonly statusChangedEvent: string = "computer-use.statusChanged";
  public static readonly statusReadMethod: string = "computer-use.statusRead";
  public static readonly statusReadRequestModel: string = "StatusReadRequest";
  public static readonly stopMethod: string = "computer-use.stop";
  public static readonly stopRequestModel: string = "StopRequest";
  public static readonly unknownField: string = "The field is not known.";

  public static formatFieldPath(path: string, field: string): string {
    return `${path}${Resources.fieldPathSeparator}${field}`;
  }

  public static formatInvalidColor(value: string): string {
    return `"${value}" is not a colour of the form #RRGGBB.`;
  }

  public static formatSessionIdMismatch(state: string): string {
    return `A session ID is given exactly when the state is Controlling; the state is ${state}.`;
  }

  public static formatUnknownControlState(value: string): string {
    return `"${value}" is not a known control state.`;
  }
}
