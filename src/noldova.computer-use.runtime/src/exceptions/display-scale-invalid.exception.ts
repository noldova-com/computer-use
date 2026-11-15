/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { DisplayException } from "./display.exception.ts";

export class DisplayScaleInvalidException extends DisplayException {
  public readonly displayId: string;

  public constructor(displayId: string) {
    super(Resources.formatInvalidScaleFactor(displayId));

    this.displayId = displayId;
  }
}
