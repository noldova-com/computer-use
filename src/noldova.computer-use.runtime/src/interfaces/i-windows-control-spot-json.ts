/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IWindowsControlSpotJson {
  readonly controlType: number;
  readonly name: string;
  readonly isEnabled: boolean;
  readonly isOffscreen: boolean;
  readonly x: number;
  readonly y: number;
}
