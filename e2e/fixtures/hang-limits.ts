/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class HangLimits {
  public static readonly CI_TEST_COVERS_A_COLD_APP_START_AND_QUIT_MS: number = 120_000;
  public static readonly APP_QUITS_WITHIN_S: number = 30;
  public static readonly APP_CLOSES_AFTER_ITS_QUIT_MS: number = 30_000;
  public static readonly DESKTOP_TEST_COVERS_A_COLD_APP_START_THE_TEST_WINDOW_AND_EVERY_TOOL_CALL_MS: number = 240_000;
}
