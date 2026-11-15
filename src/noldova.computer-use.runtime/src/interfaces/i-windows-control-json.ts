/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IWindowsControlJson {
  readonly handle: string;
  readonly parentHandle: string | null;
  readonly processId: number;
  readonly imagePath: string;
  readonly controlType: number;
  readonly name: string;
  readonly value: string | null;
  readonly isEnabled: boolean;
  readonly hasFocus: boolean;
  readonly isPassword: boolean;
  readonly isReadOnly: boolean;
  readonly isSelected: boolean;
  readonly toggleState: number;
  readonly expandState: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
