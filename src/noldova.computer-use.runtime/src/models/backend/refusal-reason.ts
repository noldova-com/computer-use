/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { RefusalReasonUnknownException } from "../../exceptions/refusal-reason-unknown.exception.ts";
import { Resources } from "../../resources.ts";

export class RefusalReason {
  public static readonly NotForeground: RefusalReason = new RefusalReason("NotForeground", Resources.refusalNotForeground);
  public static readonly OtherWindowAtPoint: RefusalReason = new RefusalReason("OtherWindowAtPoint", Resources.refusalOtherWindowAtPoint);
  public static readonly ElevatedTarget: RefusalReason = new RefusalReason("ElevatedTarget", Resources.refusalElevatedTarget);
  public static readonly TargetRightsUnknown: RefusalReason = new RefusalReason("TargetRightsUnknown", Resources.refusalTargetRightsUnknown);
  public static readonly ForegroundChanged: RefusalReason = new RefusalReason("ForegroundChanged", Resources.refusalForegroundChanged);
  public static readonly SecureInput: RefusalReason = new RefusalReason("SecureInput", Resources.refusalSecureInput);
  public static readonly PasswordField: RefusalReason = new RefusalReason("PasswordField", Resources.refusalPasswordField);
  public static readonly MissingGrant: RefusalReason = new RefusalReason("MissingGrant", Resources.refusalMissingGrant);
  public static readonly DesktopOnlyCapture: RefusalReason = new RefusalReason("DesktopOnlyCapture", Resources.refusalDesktopOnlyCapture);
  public static readonly OutsideDisplays: RefusalReason = new RefusalReason("OutsideDisplays", Resources.refusalOutsideDisplays);
  public static readonly PhysicalInput: RefusalReason = new RefusalReason("PhysicalInput", Resources.refusalPhysicalInput);
  public static readonly ControlChanged: RefusalReason = new RefusalReason("ControlChanged", Resources.refusalControlChanged);
  public static readonly FocusOutsideTarget: RefusalReason = new RefusalReason("FocusOutsideTarget", Resources.refusalFocusOutsideTarget);
  public static readonly FocusUnknown: RefusalReason = new RefusalReason("FocusUnknown", Resources.refusalFocusUnknown);
  public static readonly all: readonly RefusalReason[] = [
    RefusalReason.NotForeground,
    RefusalReason.OtherWindowAtPoint,
    RefusalReason.ElevatedTarget,
    RefusalReason.TargetRightsUnknown,
    RefusalReason.ForegroundChanged,
    RefusalReason.SecureInput,
    RefusalReason.PasswordField,
    RefusalReason.MissingGrant,
    RefusalReason.DesktopOnlyCapture,
    RefusalReason.OutsideDisplays,
    RefusalReason.PhysicalInput,
    RefusalReason.ControlChanged,
    RefusalReason.FocusOutsideTarget,
    RefusalReason.FocusUnknown
  ];
  public readonly description: string;
  public readonly value: string;

  private constructor(value: string, description: string) {
    this.description = description;
    this.value = value;
  }

  public static parse(value: string): RefusalReason {
    const reason = RefusalReason.all.find(t => t.value === value);
    if (reason === undefined)
      throw new RefusalReasonUnknownException(value);

    return reason;
  }
}
