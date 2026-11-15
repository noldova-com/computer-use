/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { Resources } from "../resources.ts";
import { PackageLayout } from "./package-layout.ts";
import type { ProcessRunner } from "./process-runner.ts";

export class JxaBuild {
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, runner: ProcessRunner, report: (line: string) => void) {
    this.report = report;
    this.root = root;
    this.runner = runner;
  }

  public static async listScriptsAsync(root: string, part: IPackagePart): Promise<readonly string[]> {
    const sources = path.join(root, part.folder, PackageLayout.sourcesOf(part), Resources.jxaSourceFolder);
    if (!existsSync(sources))
      return [];

    return (await readdir(sources))
      .filter(t => t.endsWith(Resources.sourceExtension) && !t.endsWith(Resources.declarationExtension))
      .map(t => `${t.slice(0, -Resources.sourceExtension.length)}${Resources.scriptExtension}`)
      .sort();
  }

  public async runAsync(parts: readonly IPackagePart[]): Promise<number> {
    let failed = 0;
    for (const part of parts)
      if (!await this.buildAsync(part))
        failed++;

    return failed === 0 ? Resources.successExitCode : Resources.failureExitCode;
  }

  private async buildAsync(part: IPackagePart): Promise<boolean> {
    const output = path.join(PackageLayout.stagingOf(this.root, part), Resources.jxaOutputFolder);
    await rm(output, { recursive: true, force: true });
    const sources = path.posix.join(part.folder, PackageLayout.sourcesOf(part), Resources.jxaSourceFolder);
    const project = path.join(this.root, sources, Resources.projectFile);
    if (!existsSync(project))
      return true;

    const work = path.join(this.root, ...Resources.jxaWorkSegments, path.posix.basename(part.folder));
    await rm(work, { recursive: true, force: true });
    const result = await this.runner.captureAsync(
      process.execPath,
      [path.join(this.root, ...Resources.compilerSegments), Resources.projectOption, project, Resources.outDirOption, work, ...Resources.jxaCompileArguments],
      this.root,
      Resources.compileTimeout);
    if (!result.isSuccessful) {
      this.report(Resources.formatCompileFailed(sources, result.exitCode, result.text));
      return false;
    }

    const scripts = path.join(work, Resources.jxaSourceFolder);
    await mkdir(output, { recursive: true });
    for (const file of await readdir(scripts))
      if (file.endsWith(Resources.scriptExtension))
        await copyFile(path.join(scripts, file), path.join(output, file));

    return true;
  }
}
