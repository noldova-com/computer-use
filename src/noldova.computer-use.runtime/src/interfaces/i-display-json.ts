/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IDisplayJson {
  readonly [key: string]: string | number | boolean;
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scaleFactor: number;
  readonly isPrimary: boolean;
}
