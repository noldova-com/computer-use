/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IWindowsWindowJson {
  readonly windowId: string;
  readonly processId: number;
  readonly imagePath: string;
  readonly className: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isElevated: boolean;
}
