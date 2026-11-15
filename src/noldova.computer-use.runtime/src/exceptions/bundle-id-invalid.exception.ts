/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class BundleIdInvalidException extends BackendValueException {
  public readonly bundleId: string;

  public constructor(bundleId: string) {
    super(Resources.formatInvalidMacBundleId(bundleId));

    this.bundleId = bundleId;
  }
}
