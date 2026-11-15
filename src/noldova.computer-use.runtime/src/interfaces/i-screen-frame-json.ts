/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IScreenFrameJson {
  readonly [key: string]: string | number;
  readonly id: string;
  readonly display: string;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}
