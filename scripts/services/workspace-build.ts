/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { ScriptException } from "../exceptions/script.exception.ts";
import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { Resources } from "../resources.ts";
import { AddonBuild } from "./addon-build.ts";
import { Git } from "./git.ts";
import { JxaBuild } from "./jxa-build.ts";
import { KitAccentBuild } from "./kit-accent-build.ts";
import type { NpmCommand } from "./npm-command.ts";
import { PackageBuild } from "./package-build.ts";
import { PackageInstall } from "./package-install.ts";
import type { PackageLayout } from "./package-layout.ts";
import { PackagePacker } from "./package-packer.ts";
import type { ProcessRunner } from "./process-runner.ts";
import { Release } from "./release.ts";
import { ReleaseBuild } from "./release-build.ts";

export class WorkspaceBuild {
  private readonly environment: NodeJS.ProcessEnv;
  private readonly layout: PackageLayout;
  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, layout: PackageLayout, runner: ProcessRunner, npm: NpmCommand, environment: NodeJS.ProcessEnv, report: (line: string) => void) {
    this.environment = environment;
    this.layout = layout;
    this.npm = npm;
    this.report = report;
    this.root = root;
    this.runner = runner;
  }

  public async runAsync(): Promise<number> {
    const installed = existsSync(path.join(this.root, Resources.dependenciesFolder))
      ? Resources.successExitCode
      : await this.runner.runAsync(process.execPath, [this.environment[Resources.npmPathVariable] ?? "", ...Resources.cleanInstallArguments], this.root);
    if (installed !== Resources.successExitCode)
      return installed;
    const released = PackagePacker.releaseCommitOf(this.environment);
    const commit = released ?? await this.readHeadAsync();
    if (commit === null)
      return Resources.failureExitCode;
    const releaseBuild = new ReleaseBuild(this.root, this.report, (version, releasedCommit) =>
      new Release(this.root, this.runner, this.environment, process.stdout).runAsync([Resources.checkCommand, Resources.archivesFolder, version, releasedCommit]));
    const versioned = await releaseBuild.checkVersionAsync();
    if (versioned !== Resources.successExitCode)
      return versioned;
    const parts = await this.layout.readPartsAsync();
    const packageBuild = new PackageBuild(this.root, this.runner, this.report);
    const named = packageBuild.checkNames(parts);
    if (named !== Resources.successExitCode)
      return named;

    const install = new PackageInstall(this.root, this.npm, this.report);
    const packed: IPackagePart[] = [];
    let uninstalled = new Set<string>();
    for (const part of parts) {
      if (part.dependencies.some(t => uninstalled.has(t))) {
        const partsInstalled = await install.runAsync(packed);
        if (partsInstalled !== Resources.successExitCode)
          return partsInstalled;
        uninstalled = new Set<string>();
      }
      const partBuilt = await this.buildPartAsync(part, commit);
      if (partBuilt !== Resources.successExitCode)
        return partBuilt;
      packed.push(part);
      uninstalled.add(part.name);
    }
    const ready = uninstalled.size === 0 ? Resources.successExitCode : await install.runAsync(packed);
    const checked = ready !== Resources.successExitCode ? ready : await packageBuild.checkProjectsAsync(parts);

    return checked !== Resources.successExitCode ? checked : await releaseBuild.checkArchivesAsync(released);
  }

  private async buildPartAsync(part: IPackagePart, commit: string): Promise<number> {
    await PackagePacker.clearAsync(this.root, part);
    const scripted = await new JxaBuild(this.root, this.runner, this.report).runAsync([part]);
    const accented = scripted !== Resources.successExitCode ? scripted : await new KitAccentBuild(this.root, this.report).runAsync([part]);
    const built = accented !== Resources.successExitCode
      ? accented
      : await new AddonBuild(this.root, this.runner, process.platform, process.arch, this.environment, this.report).runAsync([part]);

    return built !== Resources.successExitCode ? built : await new PackagePacker(this.root, this.runner, this.npm, this.report).runAsync([part], commit);
  }

  private async readHeadAsync(): Promise<string | null> {
    try {
      return (await new Git(this.root, this.runner).readOutputAsync([Resources.gitRevParse, Resources.headReference])).trim();
    }
    catch (error) {
      if (!(error instanceof ScriptException))
        throw error;
      this.report(error.message);
      return null;
    }
  }
}
