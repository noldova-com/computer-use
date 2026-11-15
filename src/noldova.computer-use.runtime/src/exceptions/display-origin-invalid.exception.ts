/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { DisplayException } from "./display.exception.ts";

export class DisplayOriginInvalidException extends DisplayException {
  public readonly displayId: string;

  public constructor(displayId: string) {
    super(Resources.formatInvalidDisplayOrigin(displayId));

    this.displayId = displayId;
  }
}
