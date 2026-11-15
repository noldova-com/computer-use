/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProcessException } from "./process.exception.ts";

export class GitFailedException extends ProcessException {
  public readonly gitArguments: readonly string[];
  public readonly exitCode: number | null;
  public readonly errors: string;

  public constructor(gitArguments: readonly string[], exitCode: number | null, errors: string) {
    super(Resources.formatGitFailed(gitArguments, exitCode, errors));

    this.gitArguments = gitArguments;
    this.exitCode = exitCode;
    this.errors = errors;
  }
}
