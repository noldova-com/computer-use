/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { AddonLoadException } from "./addon-load.exception.ts";

export class AddonMissingException extends AddonLoadException {
  public readonly file: string;
  public readonly target: string;

  public constructor(file: string, target: string) {
    super(Resources.formatAddonMissing(file, target));

    this.file = file;
    this.target = target;
  }
}
