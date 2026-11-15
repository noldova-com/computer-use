/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class HangGuard {
  private static readonly BELOW_UNIT_HANG_LIMIT_MS: number = 10_000;

  public static signal(): AbortSignal {
    return AbortSignal.timeout(HangGuard.BELOW_UNIT_HANG_LIMIT_MS);
  }
}
