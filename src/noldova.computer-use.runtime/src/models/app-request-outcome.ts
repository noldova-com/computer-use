/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class AppRequestOutcome {
  public static readonly Granted: AppRequestOutcome = new AppRequestOutcome("Granted", true);
  public static readonly Denied: AppRequestOutcome = new AppRequestOutcome("Denied", false);
  public static readonly Expired: AppRequestOutcome = new AppRequestOutcome("Expired", false);
  public static readonly Withdrawn: AppRequestOutcome = new AppRequestOutcome("Withdrawn", false);
  public static readonly NotFound: AppRequestOutcome = new AppRequestOutcome("NotFound", false);
  public static readonly NeverGrantable: AppRequestOutcome = new AppRequestOutcome("NeverGrantable", false);
  public readonly isGranted: boolean;
  public readonly value: string;

  private constructor(value: string, isGranted: boolean) {
    this.isGranted = isGranted;
    this.value = value;
  }
}
