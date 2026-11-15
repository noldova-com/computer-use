/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IWindowsOutcomeJson {
  readonly status: "done" | "refused" | "stopped";
  readonly reason?: string;
  readonly inputSent?: boolean;
}
