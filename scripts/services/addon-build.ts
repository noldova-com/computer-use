/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { AddonListInvalidException } from "../exceptions/addon-list-invalid.exception.ts";
import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { DeclaredAddons } from "../models/declared-addons.ts";
import { Resources } from "../resources.ts";
import { PackageLayout } from "./package-layout.ts";
import type { ProcessRunner } from "./process-runner.ts";

export class AddonBuild {
  private readonly architecture: string;
  private readonly environment: NodeJS.ProcessEnv;
  private readonly platform: string;
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, runner: ProcessRunner, platform: string, architecture: string, environment: NodeJS.ProcessEnv, report: (line: string) => void) {
    this.architecture = architecture;
    this.environment = environment;
    this.platform = platform;
    this.report = report;
    this.root = root;
    this.runner = runner;
  }

  public static async listReleaseBuildsAsync(root: string, part: IPackagePart): Promise<readonly string[]> {
    const addons = await AddonBuild.readAddonsAsync(root, part);

    return [
      ...addons.windows.flatMap(addon => Resources.windowsAddonTargets.map(target => Resources.formatReleaseBuild(target, addon))),
      ...addons.posix.flatMap(addon => Resources.posixAddonTargets.map(target => Resources.formatReleaseBuild(target, addon)))
    ];
  }

  public async runAsync(parts: readonly IPackagePart[]): Promise<number> {
    const release = this.environment[Resources.releaseAddonsVariable];
    if (release !== undefined && release !== "")
      return await this.copyReleaseAsync(parts, release);

    return await this.buildHostAsync(parts);
  }

  private async copyReleaseAsync(parts: readonly IPackagePart[], release: string): Promise<number> {
    if (!path.isAbsolute(release)) {
      this.report(Resources.formatReleaseAddonsNotAbsolute(Resources.releaseAddonsVariable, release));
      return Resources.failureExitCode;
    }

    let failed = 0;
    for (const part of parts)
      for (const build of await AddonBuild.listReleaseBuildsAsync(this.root, part)) {
        const [target = "", file = ""] = build.split(Resources.pathSeparator);
        const source = path.join(release, part.folder, target, file);
        if (!await AddonBuild.existsAsync(source)) {
          this.report(Resources.formatReleaseAddonMissing(part.name, path.basename(file, Resources.addonExtension), target, Resources.releaseAddonsVariable, source));
          failed++;
          continue;
        }
        const output = path.join(PackageLayout.stagingOf(this.root, part), Resources.addonOutputFolder, target);
        await mkdir(output, { recursive: true });
        await copyFile(source, path.join(output, file));
      }

    return failed === 0 ? Resources.successExitCode : Resources.failureExitCode;
  }

  private async buildHostAsync(parts: readonly IPackagePart[]): Promise<number> {
    const isWindows = this.platform === Resources.windowsPlatform;
    if (!isWindows && !Resources.posixPlatforms.includes(this.platform))
      return Resources.successExitCode;
    const builds: { readonly part: IPackagePart; readonly addon: string }[] = [];
    for (const part of parts) {
      const addons = await AddonBuild.readAddonsAsync(this.root, part);
      builds.push(...(isWindows ? addons.windows : addons.posix).map(addon => ({ part, addon })));
    }
    if (builds.length === 0)
      return Resources.successExitCode;
    const npm = this.environment[Resources.npmPathVariable];
    if (npm === undefined || npm === "") {
      this.report(Resources.formatNpmPathUnset(Resources.npmPathVariable));
      return Resources.failureExitCode;
    }

    const nodeGyp = path.join(path.dirname(npm), ...Resources.nodeGypSegments);
    let failed = 0;
    for (const { part, addon } of builds)
      if (!await this.buildAsync(part, addon, nodeGyp))
        failed++;

    return failed === 0 ? Resources.successExitCode : Resources.failureExitCode;
  }

  private static async readAddonsAsync(root: string, part: IPackagePart): Promise<DeclaredAddons> {
    const file = path.posix.join(part.folder, Resources.manifestFile);
    const manifest: unknown = JSON.parse(await readFile(path.join(root, file), Resources.textEncoding));
    const noldova = AddonBuild.readField(manifest, Resources.noldovaField);

    return new DeclaredAddons(
      AddonBuild.readAddons(noldova, Resources.windowsAddonsField, file),
      AddonBuild.readAddons(noldova, Resources.posixAddonsField, file));
  }

  private async buildAsync(part: IPackagePart, addon: string, nodeGyp: string): Promise<boolean> {
    const work = path.join(this.root, ...Resources.addonWorkSegments, path.posix.basename(part.folder), addon);
    const source = `${addon}${Resources.addonSourceExtension}`;
    const target = addon.replaceAll(Resources.addonNameSeparator, Resources.addonTargetSeparator);
    const platformTarget = Resources.formatTarget(this.platform, this.architecture);
    await rm(work, { recursive: true, force: true });
    await mkdir(work, { recursive: true });
    await copyFile(path.join(this.root, part.folder, ...Resources.addonSourceSegments, source), path.join(work, source));
    await writeFile(path.join(work, Resources.addonProjectFile), `${JSON.stringify({
      targets: [{ target_name: target, sources: [source], defines: [Resources.formatNapiVersionDefine(Resources.nodeApiVersion)] }]
    }, null, Resources.jsonIndent)}${Resources.lineBreak}`);

    const headers = path.join(this.root, ...Resources.addonHeaderSegments);
    if (await this.runner.runAsync(process.execPath, [nodeGyp, ...Resources.addonRebuildArguments, headers], work) !== Resources.successExitCode) {
      this.report(Resources.formatAddonBuildFailed(part.folder, addon, platformTarget));
      return false;
    }

    const output = path.join(PackageLayout.stagingOf(this.root, part), Resources.addonOutputFolder, platformTarget);
    await mkdir(output, { recursive: true });
    await copyFile(path.join(work, ...Resources.addonBuiltSegments, `${target}${Resources.addonExtension}`), path.join(output, `${addon}${Resources.addonExtension}`));

    return true;
  }

  private static async existsAsync(file: string): Promise<boolean> {
    try {
      await access(file);
      return true;
    }
    catch (error) {
      if (error instanceof Error && Resources.errorCodeField in error && Resources.missingFileCodes.includes(String(error[Resources.errorCodeField])))
        return false;
      throw error;
    }
  }

  private static readField(json: unknown, field: string): unknown {
    return typeof json === "object" && json !== null ? Object.entries(json).find(([name]) => name === field)?.[1] : undefined;
  }

  private static readAddons(noldova: unknown, field: string, file: string): readonly string[] {
    const addons = AddonBuild.readField(noldova, field);
    if (addons === undefined)
      return [];
    if (!Array.isArray(addons) || !addons.every(t => typeof t === "string" && Resources.addonNamePattern.test(t)))
      throw new AddonListInvalidException(file, field);

    return addons;
  }
}
