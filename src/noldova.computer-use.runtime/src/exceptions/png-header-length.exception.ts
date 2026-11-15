/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class PngHeaderLengthException extends BackendValueException {
  public readonly length: number;

  public constructor(length: number) {
    super(Resources.formatPngHeaderLength(length));

    this.length = length;
  }
}
