/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IWindowsAppPathsJson {
  readonly host: string;
  readonly running: readonly string[];
  readonly installed: readonly string[];
}
