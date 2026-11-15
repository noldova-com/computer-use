/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { AddonLoadException } from "./addon-load.exception.ts";

export class AddonIncompleteException extends AddonLoadException {
  public readonly file: string;

  public constructor(file: string) {
    super(Resources.formatAddonIncomplete(file));

    this.file = file;
  }
}
