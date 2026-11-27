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

import { FieldMissingException } from "../exceptions/field-missing.exception.ts";
import { FieldNotObjectException } from "../exceptions/field-not-object.exception.ts";
import { FieldNotStringException } from "../exceptions/field-not-string.exception.ts";
import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { PackagePart } from "../models/package-part.ts";
import { Resources } from "../resources.ts";

export class PackageLayout {
  private readonly root: string;

  public constructor(root: string) {
    this.root = root;
  }

  public async readPartsAsync(): Promise<readonly IPackagePart[]> {
    const parts: IPackagePart[] = [];
    for (const folder of Resources.partFolders) {
      const manifestFile = path.posix.join(folder, Resources.manifestFile);
      const isModule = existsSync(path.join(this.root, folder, Resources.moduleFile));
      const partAt = folder.lastIndexOf(Resources.partSeparator);
      const moduleFile = path.posix.join(isModule ? folder : folder.slice(0, partAt), Resources.moduleFile);
      const manifest = await this.readJsonAsync(manifestFile);
      const name = PackageLayout.readString(manifest, Resources.nameField, manifestFile);
      const version = PackageLayout.readString(manifest, Resources.versionField, manifestFile);
      const moduleId = PackageLayout.readString(await this.readJsonAsync(moduleFile), Resources.idField, moduleFile);
      const expectedName = Resources.formatPackageName(moduleId, isModule ? "" : folder.slice(partAt));
      parts.push(new PackagePart(name, version, folder, expectedName, isModule, PackageLayout.readNames(manifest, Resources.dependenciesField, manifestFile)));
    }

    return parts;
  }

  public static sourcesOf(part: IPackagePart): string {
    return part.isModule ? Resources.moduleSources : Resources.partSources;
  }

  public static stagingOf(root: string, part: IPackagePart): string {
    return path.join(root, ...Resources.packageWorkSegments, path.posix.basename(part.folder));
  }

  private static fieldsOf(json: unknown): ReadonlyMap<string, unknown> {
    return typeof json === "object" && json !== null && !Array.isArray(json) ? new Map<string, unknown>(Object.entries(json)) : new Map<string, unknown>();
  }

  private static readString(json: unknown, field: string, file: string): string {
    const fields = PackageLayout.fieldsOf(json);
    if (!fields.has(field))
      throw new FieldMissingException(file, field);
    const value = fields.get(field);
    if (typeof value !== "string")
      throw new FieldNotStringException(file, field);

    return value;
  }

  private static readNames(json: unknown, field: string, file: string): readonly string[] {
    const value = PackageLayout.fieldsOf(json).get(field);
    if (value === undefined)
      return [];
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new FieldNotObjectException(file, field);

    return Object.keys(value);
  }

  private async readJsonAsync(file: string): Promise<unknown> {
    return JSON.parse(await readFile(path.join(this.root, file), Resources.textEncoding));
  }
}
