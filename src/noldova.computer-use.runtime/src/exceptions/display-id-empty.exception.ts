/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { DisplayException } from "./display.exception.ts";

export class DisplayIdEmptyException extends DisplayException {
  public constructor() {
    super(Resources.emptyDisplayId);
  }
}
