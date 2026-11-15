/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IMacControlJson {
  readonly handle: string;
  readonly parentHandle: string | null;
  readonly bundleId: string;
  readonly role: string;
  readonly subrole: string;
  readonly name: string;
  readonly value: string | null;
  readonly isEnabled: boolean;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly checkState: number;
  readonly isExpanded: boolean | null;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
