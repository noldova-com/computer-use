/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IPackagePart {
  readonly dependencies: readonly string[];
  readonly expectedName: string;
  readonly folder: string;
  readonly isModule: boolean;
  readonly name: string;
  readonly version: string;
}
