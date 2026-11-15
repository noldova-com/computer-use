/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class PeerManifestUnreadableException extends PackageException {
  public readonly dependency: string;
  public readonly file: string;

  public constructor(dependency: string, file: string, cause: unknown) {
    super(Resources.formatPeerManifestUnreadable(dependency, file), { cause });

    this.dependency = dependency;
    this.file = file;
  }
}
