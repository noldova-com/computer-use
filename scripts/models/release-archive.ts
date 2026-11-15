/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPackagePart } from "../interfaces/i-package-part.ts";

export class ReleaseArchive {
  public readonly part: IPackagePart;
  public readonly filePath: string;

  public constructor(part: IPackagePart, filePath: string) {
    this.part = part;
    this.filePath = filePath;
  }
}
