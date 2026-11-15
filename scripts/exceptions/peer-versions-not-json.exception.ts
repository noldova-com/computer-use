/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class PeerVersionsNotJsonException extends PackageException {
  public readonly dependency: string;
  public readonly output: string;

  public constructor(dependency: string, output: string, cause: unknown) {
    super(Resources.formatPeerVersionsNotJson(dependency, output), { cause });

    this.dependency = dependency;
    this.output = output;
  }
}
