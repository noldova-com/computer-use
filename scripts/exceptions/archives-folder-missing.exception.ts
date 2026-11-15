/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class ArchivesFolderMissingException extends ReleaseException {
  public readonly folder: string;

  public constructor(folder: string) {
    super(Resources.formatArchivesFolderMissing(folder));

    this.folder = folder;
  }
}
