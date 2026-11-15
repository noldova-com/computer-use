/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class PngDataCorruptException extends BackendValueException {
  public constructor(cause: unknown) {
    super(Resources.pngDataCorrupt, new ExceptionOptions(cause));
  }
}
