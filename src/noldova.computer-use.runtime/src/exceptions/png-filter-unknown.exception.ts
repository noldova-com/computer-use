/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class PngFilterUnknownException extends BackendValueException {
  public readonly filter: number;

  public constructor(filter: number) {
    super(Resources.formatPngUnknownFilter(filter));

    this.filter = filter;
  }
}
