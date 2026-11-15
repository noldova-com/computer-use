/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";
import { ToolFailure, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import type { RefusalException } from "../exceptions/refusal.exception.ts";
import { AbortReasonKind } from "../models/abort-reason-kind.ts";
import { RefusalReason } from "../models/backend/refusal-reason.ts";
import { Resources } from "../resources.ts";

export class CallFailures {
  private static readonly STALE_REASONS: readonly RefusalReason[] = [
    RefusalReason.NotForeground,
    RefusalReason.OtherWindowAtPoint,
    RefusalReason.ForegroundChanged,
    RefusalReason.OutsideDisplays,
    RefusalReason.ControlChanged,
    RefusalReason.FocusOutsideTarget
  ];

  private static readonly STOP_REASONS: readonly RefusalReason[] = [RefusalReason.PhysicalInput];

  public static of(code: ToolFailureCode, message: string, moduleCode: string | null = null): ToolFailureException {
    return new ToolFailureException(new ToolFailure(code, message, moduleCode));
  }

  public static causedBy(cause: unknown, code: ToolFailureCode, message: string, moduleCode: string | null = null): ToolFailureException {
    return new ToolFailureException(new ToolFailure(code, message, moduleCode), new ExceptionOptions(cause));
  }

  public static ofAbort(signal: AbortSignal, isInputSent: boolean): ToolFailureException {
    const kind = AbortReasonKind.of(signal);
    if (isInputSent)
      return CallFailures.of(ToolFailureCode.OutcomeUncertain, Resources.formatEndedAfterInput(kind.reason));

    return CallFailures.of(kind.code, kind.message);
  }

  public static ofAbortWhileRequestWaits(signal: AbortSignal): ToolFailureException {
    const kind = AbortReasonKind.of(signal);
    return CallFailures.of(kind.requestCode, kind.requestMessage);
  }

  public static ofBackendFailure(signal: AbortSignal, isInputSent: boolean, cause: unknown): ToolFailureException {
    if (signal.aborted)
      return CallFailures.ofAbort(signal, isInputSent);

    return CallFailures.causedBy(cause, ToolFailureCode.OutcomeUncertain, Resources.backendFailedDuringInput);
  }

  public static ofRefusal(refusal: RefusalException, isInputSent: boolean): ToolFailureException {
    const description = refusal.reason.description;
    const moduleCode = CallFailures.moduleCodeOf(refusal.reason);
    if (isInputSent || refusal.isInputSent)
      return CallFailures.of(ToolFailureCode.OutcomeUncertain, Resources.formatRefusedAfterInput(description), moduleCode);
    if (CallFailures.STOP_REASONS.includes(refusal.reason))
      return CallFailures.of(ToolFailureCode.Stopped, Resources.formatStoppedByPerson(description), moduleCode);
    if (CallFailures.STALE_REASONS.includes(refusal.reason))
      return CallFailures.of(ToolFailureCode.Stale, Resources.formatStale(description), moduleCode);

    return CallFailures.of(ToolFailureCode.Refused, description, moduleCode);
  }

  public static moduleCodeOf(reason: RefusalReason): string {
    return Resources.formatModuleCode(reason.value.charAt(0).toLowerCase() + reason.value.slice(1));
  }
}
