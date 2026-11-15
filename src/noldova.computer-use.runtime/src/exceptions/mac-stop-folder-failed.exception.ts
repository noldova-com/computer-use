/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { MacDesktopException } from "./mac-desktop.exception.ts";

export class MacStopFolderFailedException extends MacDesktopException {
  public readonly folder: string;

  public constructor(folder: string, cause: unknown) {
    super(Resources.formatMacStopFolderFailed(folder), new ExceptionOptions(cause));

    this.folder = folder;
  }
}
