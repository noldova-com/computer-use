/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Writable } from "node:stream";

import { ArchiveManifestUnreadableException } from "../exceptions/archive-manifest-unreadable.exception.ts";
import { ArchivesFolderMissingException } from "../exceptions/archives-folder-missing.exception.ts";
import { CheckoutMismatchException } from "../exceptions/checkout-mismatch.exception.ts";
import { CommitInvalidException } from "../exceptions/commit-invalid.exception.ts";
import { GitHubObjectExpectedException } from "../exceptions/github-object-expected.exception.ts";
import { ReleaseFindingsException } from "../exceptions/release-findings.exception.ts";
import { ScriptException } from "../exceptions/script.exception.ts";
import { VariableUnsetException } from "../exceptions/variable-unset.exception.ts";
import { VersionInvalidException } from "../exceptions/version-invalid.exception.ts";
import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { ReleaseArchive } from "../models/release-archive.ts";
import { Resources } from "../resources.ts";
import { AddonBuild } from "./addon-build.ts";
import { ArchiveReader } from "./archive-reader.ts";
import { Git } from "./git.ts";
import { GitHubJson } from "./github-json.ts";
import { JxaBuild } from "./jxa-build.ts";
import { PackageLayout } from "./package-layout.ts";
import type { ProcessRunner } from "./process-runner.ts";

export class Release {
  private readonly root: string;
  private readonly git: Git;
  private readonly environment: NodeJS.ProcessEnv;
  private readonly output: Writable;
  private readonly archiveReader: ArchiveReader = new ArchiveReader();

  public constructor(root: string, runner: ProcessRunner, environment: NodeJS.ProcessEnv, output: Writable) {
    this.root = root;
    this.git = new Git(root, runner);
    this.environment = environment;
    this.output = output;
  }

  public async runAsync(releaseArguments: readonly string[]): Promise<number> {
    const [command, ...values] = releaseArguments;
    try {
      if (command === Resources.checkCommand && values.length === Resources.checkArgumentCount)
        await this.checkArchivesAsync(values[0] ?? "", Release.validateVersion(values[1]), Release.validateCommit(values[2]));
      else {
        this.output.write(Resources.releaseUsage);
        return Resources.usageExitCode;
      }
      return Resources.successExitCode;
    }
    catch (error) {
      if (!(error instanceof ScriptException))
        throw error;
      this.output.write(`${error.message}${Resources.lineBreak}`);
      return Resources.failureExitCode;
    }
  }

  private async checkArchivesAsync(folder: string, version: string, commit: string): Promise<void> {
    await this.checkHeadAsync(commit);
    for (const archive of await this.listArchivesAsync(folder, version, commit))
      this.output.write(`${Resources.formatArchiveChecked(path.basename(archive.filePath), archive.part.name, version, commit)}${Resources.lineBreak}`);
  }

  private async listPackagesAsync(): Promise<readonly IPackagePart[]> {
    return new PackageLayout(this.root).readPartsAsync();
  }

  private async listArchivesAsync(folder: string, version: string, commit: string): Promise<readonly ReleaseArchive[]> {
    const directory = path.resolve(this.root, folder);
    if (!existsSync(directory))
      throw new ArchivesFolderMissingException(folder);

    const scope = this.readVariable(Resources.releaseScopeVariable);
    const archives = (await this.listPackagesAsync()).map(t => new ReleaseArchive(t, path.join(directory, Resources.formatArchiveName(t.name, version))));
    const expected = archives.map(t => path.basename(t.filePath));
    const found = (await readdir(directory)).sort();
    const findings = [
      ...expected.filter(t => !found.includes(t)).map(t => Resources.formatArchiveMissing(folder, t)),
      ...found.filter(t => !expected.includes(t)).map(t => Resources.formatStrayFile(folder, t, version))
    ];

    const names = archives.map(t => t.part.name);
    for (const archive of archives.filter(t => found.includes(path.basename(t.filePath))))
      findings.push(...await this.checkArchiveAsync(archive, version, commit, scope, names));

    if (findings.length > 0)
      throw new ReleaseFindingsException(findings);

    return archives;
  }

  private async checkArchiveAsync(archive: ReleaseArchive, version: string, commit: string, scope: string, names: readonly string[]): Promise<readonly string[]> {
    const archiveName = path.basename(archive.filePath);
    const entries = await this.archiveReader.readAsync(archive.filePath);
    const findings = (await AddonBuild.listReleaseBuildsAsync(this.root, archive.part))
      .map(t => Resources.formatArchiveEntry(Resources.addonOutputFolder, t))
      .filter(t => !entries.has(t))
      .map(t => Resources.formatAddonEntryMissing(archiveName, t));
    findings.push(...(await JxaBuild.listScriptsAsync(this.root, archive.part))
      .map(t => Resources.formatArchiveEntry(Resources.jxaOutputFolder, t))
      .filter(t => !entries.has(t))
      .map(t => Resources.formatScriptEntryMissing(archiveName, t)));
    const content = entries.get(Resources.manifestEntryName);
    if (content === undefined)
      return [...findings, Resources.formatManifestEntryMissing(archiveName)];

    const context = Resources.formatManifestContext(archiveName);
    const manifest = Release.parseObject(content.toString(Resources.textEncoding), context);
    const name = GitHubJson.text(manifest, Resources.nameField, context);
    if (name !== archive.part.name)
      findings.push(Resources.formatFieldMismatch(archiveName, Resources.nameField, name, archive.part.name));
    if (!name.startsWith(Resources.formatScopePrefix(scope)))
      findings.push(Resources.formatOutsideScope(archiveName, name, scope));

    const foundVersion = GitHubJson.text(manifest, Resources.versionField, context);
    if (foundVersion !== version)
      findings.push(Resources.formatFieldMismatch(archiveName, Resources.versionField, foundVersion, version));
    if (manifest[Resources.privateField] === true)
      findings.push(Resources.formatMarkedPrivate(archiveName));
    const foundCommit = manifest[Resources.commitField];
    if (typeof foundCommit !== "string")
      findings.push(Resources.formatCommitMissing(archiveName, commit));
    else if (foundCommit !== commit)
      findings.push(Resources.formatFieldMismatch(archiveName, Resources.commitField, foundCommit, commit));

    const dependencies = manifest[Resources.dependenciesField] === undefined ? null : GitHubJson.nullableChild(manifest, Resources.dependenciesField, context);
    if (dependencies !== null)
      for (const dependency of Object.keys(dependencies).filter(t => names.includes(t))) {
        const range = GitHubJson.text(dependencies, dependency, context);
        if (range !== version)
          findings.push(Resources.formatDependencyMismatch(archiveName, dependency, range, version));
      }

    return findings;
  }

  private async checkHeadAsync(commit: string): Promise<void> {
    const head = (await this.git.readOutputAsync([Resources.gitRevParse, Resources.headReference])).trim();
    if (head !== commit)
      throw new CheckoutMismatchException(head, commit);
  }

  private readVariable(name: string): string {
    const value = this.environment[name];
    if (value === undefined || value.length === 0)
      throw new VariableUnsetException(name);

    return value;
  }

  private static parseObject(text: string, context: string): Readonly<Record<string, unknown>> {
    try {
      return GitHubJson.object(JSON.parse(text), context);
    }
    catch (error) {
      if (!(error instanceof SyntaxError) && !(error instanceof GitHubObjectExpectedException))
        throw error;
      throw new ArchiveManifestUnreadableException(context, error);
    }
  }

  private static validateVersion(version: string | undefined): string {
    if (version === undefined || !Resources.releaseVersionPattern.test(version))
      throw new VersionInvalidException(version);

    return version;
  }

  private static validateCommit(commit: string | undefined): string {
    if (commit === undefined || !Resources.commitPattern.test(commit))
      throw new CommitInvalidException(commit);

    return commit;
  }
}
