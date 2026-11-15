/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { FieldNotStringException } from "../exceptions/field-not-string.exception.ts";
import { ManifestNotObjectException } from "../exceptions/manifest-not-object.exception.ts";
import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { Resources } from "../resources.ts";
import type { NpmCommand } from "./npm-command.ts";

export class PackageInstall {
  private kept: Promise<readonly string[]> | null = null;
  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, npm: NpmCommand, report: (line: string) => void) {
    this.npm = npm;
    this.report = report;
    this.root = root;
  }

  public async runAsync(parts: readonly IPackagePart[]): Promise<number> {
    this.kept ??= this.readKeptAsync(new Set());
    const kept = await this.kept;
    const archives = parts.map(t => Resources.formatArchivePath(Resources.formatArchiveName(t.name, t.version)));
    const result = await this.npm.runAsync([...Resources.installArguments, ...archives, ...kept], this.root);
    if (result.isSuccessful)
      return Resources.successExitCode;

    this.report(Resources.formatInstallFailed(result.exitCode, result.text));
    return Resources.failureExitCode;
  }

  public async readKeptAsync(moved: ReadonlySet<string>): Promise<readonly string[]> {
    const rootFile = path.join(this.root, Resources.manifestFile);
    const root = PackageInstall.fieldsOf(JSON.parse(await readFile(rootFile, Resources.textEncoding)), rootFile);
    const kept: string[] = [];
    for (const field of Resources.rootPinFields) {
      const pins = root.get(field);
      if (pins === undefined)
        continue;
      for (const name of PackageInstall.fieldsOf(pins, rootFile).keys()) {
        const file = path.join(this.root, Resources.dependenciesFolder, ...name.split(Resources.pathSeparator), Resources.manifestFile);
        if (!name.startsWith(Resources.noldovaPrefix) || moved.has(name) || !existsSync(file))
          continue;
        const version = PackageInstall.fieldsOf(JSON.parse(await readFile(file, Resources.textEncoding)), file).get(Resources.versionField);
        if (typeof version !== "string")
          throw new FieldNotStringException(file, Resources.versionField);
        kept.push(Resources.formatPackageSpec(name, version));
      }
    }
    return kept;
  }

  private static fieldsOf(json: unknown, file: string): Map<string, unknown> {
    if (typeof json !== "object" || json === null || Array.isArray(json))
      throw new ManifestNotObjectException(file);

    return new Map<string, unknown>(Object.entries(json));
  }
}
