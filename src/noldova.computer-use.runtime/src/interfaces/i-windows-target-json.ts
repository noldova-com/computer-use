/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IWindowsTargetJson {
  readonly windowId: string;
  readonly processId: number;
  readonly imagePath: string;
}
