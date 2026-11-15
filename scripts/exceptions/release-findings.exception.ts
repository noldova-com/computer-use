/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class ReleaseFindingsException extends ReleaseException {
  public readonly findings: readonly string[];

  public constructor(findings: readonly string[]) {
    super(Resources.formatReleaseFindings(findings));

    this.findings = findings;
  }
}
