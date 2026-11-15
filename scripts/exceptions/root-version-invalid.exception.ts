/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class RootVersionInvalidException extends PackageException {
  public constructor(cause?: unknown) {
    super(Resources.rootVersionInvalid, cause === undefined ? undefined : { cause });
  }
}
