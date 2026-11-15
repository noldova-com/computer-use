/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { CompileFailedException } from "../exceptions/compile-failed.exception.ts";
import { ExportSourceInvalidException } from "../exceptions/export-source-invalid.exception.ts";
import { ExportsInvalidException } from "../exceptions/exports-invalid.exception.ts";
import { ManifestNotObjectException } from "../exceptions/manifest-not-object.exception.ts";
import { PackFailedException } from "../exceptions/pack-failed.exception.ts";
import { PackageException } from "../exceptions/package.exception.ts";
import { ReadmeMissingException } from "../exceptions/readme-missing.exception.ts";
import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { PackageCopy } from "../models/package-copy.ts";
import { Resources } from "../resources.ts";
import type { NpmCommand } from "./npm-command.ts";
import { PackageLayout } from "./package-layout.ts";
import type { ProcessRunner } from "./process-runner.ts";

export class PackagePacker {
  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, runner: ProcessRunner, npm: NpmCommand, report: (line: string) => void) {
    this.npm = npm;
    this.report = report;
    this.root = root;
    this.runner = runner;
  }

  public static releaseCommitOf(environment: NodeJS.ProcessEnv): string | null {
    return environment[Resources.releaseVersionVariable] === undefined ? null : environment[Resources.releaseCommitVariable] ?? "";
  }

  public static listCopies(root: string, parts: readonly IPackagePart[]): readonly PackageCopy[] {
    const filesOf = (folder: string, filter: (file: string) => boolean): readonly string[] => existsSync(path.join(root, folder))
      ? readdirSync(path.join(root, folder), { recursive: true, withFileTypes: true }).filter(t => t.isFile())
        .map(t => path.relative(path.join(root, folder), path.join(t.parentPath, t.name)).replaceAll(path.sep, Resources.pathSeparator)).filter(filter).sort()
      : [];
    return parts.flatMap(part => {
      const sources = PackageLayout.sourcesOf(part);
      const staging = path.posix.join(...Resources.packageWorkSegments, path.posix.basename(part.folder));
      return [
        new PackageCopy(Resources.licenseFile, part.name, Resources.licenseFile),
        new PackageCopy(path.posix.join(part.folder, Resources.readmeFile), part.name, Resources.readmeFile),
        ...Resources.moduleFiles.filter(t => part.isModule && existsSync(path.join(root, part.folder, t)))
          .map(t => new PackageCopy(path.posix.join(part.folder, t), part.name, t)),
        ...filesOf(path.join(part.folder, sources), t => t.endsWith(Resources.scriptExtension) && t.split(Resources.pathSeparator)[0] !== Resources.jxaSourceFolder)
          .map(t => new PackageCopy(path.posix.join(part.folder, sources, t), part.name, path.posix.join(sources, t))),
        ...Resources.builtFolders
          .flatMap(folder => filesOf(path.join(staging, folder), () => true).map(t => new PackageCopy(path.posix.join(staging, folder, t), part.name, path.posix.join(folder, t))))
      ];
    });
  }

  public static async clearAsync(root: string, part: IPackagePart): Promise<void> {
    await rm(PackageLayout.stagingOf(root, part), { recursive: true, force: true });
  }

  public async runAsync(parts: readonly IPackagePart[], commit: string): Promise<number> {
    if (!Resources.commitPattern.test(commit)) {
      this.report(Resources.formatBuildCommitInvalid(commit));
      return Resources.failureExitCode;
    }
    let failed = 0;
    for (const part of parts)
      try {
        await this.packAsync(part, commit);
      }
      catch (error) {
        if (!(error instanceof PackageException))
          throw error;
        this.report(error.message);
        failed++;
      }

    return failed === 0 ? Resources.successExitCode : Resources.failureExitCode;
  }

  private async packAsync(part: IPackagePart, commit: string): Promise<void> {
    const source = path.join(this.root, part.folder);
    const sourceFolder = PackageLayout.sourcesOf(part);
    const sources = path.join(source, sourceFolder);
    const output = PackageLayout.stagingOf(this.root, part);
    if (!existsSync(path.join(source, Resources.readmeFile)))
      throw new ReadmeMissingException(part.folder, part.name);
    const compiled = await this.runner.captureAsync(
      process.execPath,
      [
        path.join(this.root, ...Resources.compilerSegments),
        Resources.projectOption,
        path.join(sources, Resources.projectFile),
        Resources.rootDirOption,
        source,
        Resources.outDirOption,
        output,
        ...Resources.packageCompileArguments
      ],
      this.root,
      Resources.compileTimeout);
    if (!compiled.isSuccessful)
      throw new CompileFailedException(path.posix.join(part.folder, sourceFolder), compiled.exitCode, compiled.text);

    for (const file of await readdir(sources, { recursive: true })) {
      if (file.split(path.sep)[0] === Resources.jxaSourceFolder)
        continue;
      const isDeclaration = file.endsWith(Resources.declarationExtension);
      if (!isDeclaration && !file.endsWith(Resources.scriptExtension))
        continue;
      const target = path.join(output, sourceFolder, file);
      await mkdir(path.dirname(target), { recursive: true });
      if (isDeclaration)
        await writeFile(target, (await readFile(path.join(sources, file), Resources.textEncoding)).replace(Resources.declarationImportPattern, Resources.declarationImportReplacement));
      else
        await copyFile(path.join(sources, file), target);
    }
    for (const file of part.isModule ? Resources.moduleFiles : [])
      if (existsSync(path.join(source, file)))
        await copyFile(path.join(source, file), path.join(output, file));
    await copyFile(path.join(this.root, Resources.licenseFile), path.join(output, Resources.licenseFile));
    await copyFile(path.join(source, Resources.readmeFile), path.join(output, Resources.readmeFile));
    const manifestFile = path.posix.join(part.folder, Resources.manifestFile);
    await writeFile(path.join(output, Resources.manifestFile), PackagePacker.manifestOf(await readFile(path.join(this.root, manifestFile), Resources.textEncoding), manifestFile, commit));

    const archives = path.join(this.root, Resources.archivesFolder);
    await mkdir(archives, { recursive: true });
    const packed = await this.npm.runAsync([...Resources.packArguments, archives], output);
    if (!packed.isSuccessful)
      throw new PackFailedException(part.name, packed.exitCode, packed.text);
  }

  private static manifestOf(text: string, file: string, commit: string): string {
    const manifest: unknown = JSON.parse(text);
    if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest))
      throw new ManifestNotObjectException(file);
    const exports: unknown = Object.entries(manifest).find(([field]) => field === Resources.exportsField)?.[1];
    if (typeof exports !== "object" || exports === null || Array.isArray(exports))
      throw new ExportsInvalidException(file);
    const mapped = Object.entries(exports).map(([subpath, target]) => {
      if (target === Resources.manifestExport)
        return [subpath, target] as const;
      if (typeof target !== "string" || !target.endsWith(Resources.sourceExtension) || target.endsWith(Resources.declarationExtension))
        throw new ExportSourceInvalidException(file, subpath);
      const stem = target.slice(0, -Resources.sourceExtension.length);

      return [subpath, { types: `${stem}${Resources.declarationExtension}`, default: `${stem}${Resources.scriptExtension}` }] as const;
    });

    return `${JSON.stringify({
      ...manifest,
      [Resources.exportsField]: Object.fromEntries(mapped),
      [Resources.commitField]: commit
    }, null, Resources.jsonIndent)}${Resources.lineBreak}`;
  }
}
