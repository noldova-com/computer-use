/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IPackagePart } from "../interfaces/i-package-part.ts";

export class PackagePart implements IPackagePart {
  public readonly dependencies: readonly string[];
  public readonly expectedName: string;
  public readonly folder: string;
  public readonly isModule: boolean;
  public readonly name: string;
  public readonly version: string;

  public constructor(name: string, version: string, folder: string, expectedName: string, isModule: boolean, dependencies: readonly string[]) {
    this.dependencies = dependencies;
    this.expectedName = expectedName;
    this.folder = folder;
    this.isModule = isModule;
    this.name = name;
    this.version = version;
  }
}
