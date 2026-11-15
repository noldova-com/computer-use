/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { Resources } from "../resources.ts";
import type { ProcessRunner } from "./process-runner.ts";

export class PackageBuild {
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, runner: ProcessRunner, report: (line: string) => void) {
    this.report = report;
    this.root = root;
    this.runner = runner;
  }

  public checkNames(parts: readonly IPackagePart[]): number {
    const misnamed = parts.filter(t => t.name !== t.expectedName);
    for (const part of misnamed)
      this.report(Resources.formatPackageMisnamed(part.folder, part.name, part.expectedName));

    return misnamed.length === 0 ? Resources.successExitCode : Resources.failureExitCode;
  }

  public async checkProjectsAsync(parts: readonly IPackagePart[]): Promise<number> {
    const projects = [...parts.map(t => path.posix.join(t.folder, Resources.testsFolder, Resources.projectFile)), ...Resources.sharedProjects];
    const failed: string[] = [];
    for (const project of projects)
      if (await this.runner.runAsync(process.execPath, [path.join(this.root, ...Resources.compilerSegments), Resources.projectOption, project], this.root) !== Resources.successExitCode)
        failed.push(project);
    for (const project of failed)
      this.report(Resources.formatProjectTypeCheckFailed(project));

    return failed.length === 0 ? Resources.successExitCode : Resources.failureExitCode;
  }
}
