/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ToolAbortReason, ToolFailureCode } from "@noldova/desktop.runtime";

import { Resources } from "../resources.ts";

export class AbortReasonKind {
  public static readonly Stopped: AbortReasonKind =
    new AbortReasonKind(ToolAbortReason.Stopped, ToolFailureCode.Stopped, Resources.abortStopped, ToolFailureCode.Stopped, Resources.abortStopped);
  public static readonly Cancelled: AbortReasonKind =
    new AbortReasonKind(ToolAbortReason.Cancelled, ToolFailureCode.Cancelled, Resources.abortCancelled, ToolFailureCode.Withdrawn, Resources.abortWithdrawn);
  public static readonly SessionEnded: AbortReasonKind =
    new AbortReasonKind(ToolAbortReason.SessionEnded, ToolFailureCode.Cancelled, Resources.abortSessionEnded, ToolFailureCode.Withdrawn, Resources.abortWithdrawn);
  public static readonly SwitchedOff: AbortReasonKind =
    new AbortReasonKind(ToolAbortReason.SwitchedOff, ToolFailureCode.Unavailable, Resources.abortSwitchedOff, ToolFailureCode.Unavailable, Resources.abortSwitchedOff);
  public static readonly DeadlineReached: AbortReasonKind =
    new AbortReasonKind(ToolAbortReason.DeadlineReached, ToolFailureCode.TimedOut, Resources.abortDeadlineReached, ToolFailureCode.TimedOut, Resources.abortDeadlineReached);
  public static readonly all: readonly AbortReasonKind[] = [
    AbortReasonKind.Stopped,
    AbortReasonKind.Cancelled,
    AbortReasonKind.SessionEnded,
    AbortReasonKind.SwitchedOff,
    AbortReasonKind.DeadlineReached
  ];
  public readonly code: ToolFailureCode;
  public readonly message: string;
  public readonly reason: ToolAbortReason;
  public readonly requestCode: ToolFailureCode;
  public readonly requestMessage: string;

  private constructor(reason: ToolAbortReason, code: ToolFailureCode, message: string, requestCode: ToolFailureCode, requestMessage: string) {
    this.code = code;
    this.message = message;
    this.reason = reason;
    this.requestCode = requestCode;
    this.requestMessage = requestMessage;
  }

  public static of(signal: AbortSignal): AbortReasonKind {
    return AbortReasonKind.all.find(t => t.reason === signal.reason) ?? AbortReasonKind.Cancelled;
  }
}
