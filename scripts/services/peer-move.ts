/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PackageException } from "../exceptions/package.exception.ts";
import { PeerManifestUnreadableException } from "../exceptions/peer-manifest-unreadable.exception.ts";
import { PeerVersionsNotJsonException } from "../exceptions/peer-versions-not-json.exception.ts";
import { ProcessException } from "../exceptions/process.exception.ts";
import { RootManifest } from "../models/root-manifest.ts";
import { VersionRange } from "../models/version-range.ts";
import { Resources } from "../resources.ts";
import type { NpmCommand } from "./npm-command.ts";
import type { PackageInstall } from "./package-install.ts";
import type { PackageLayout } from "./package-layout.ts";

export class PeerMove {
  private readonly install: PackageInstall;
  private readonly layout: PackageLayout;
  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, layout: PackageLayout, install: PackageInstall, npm: NpmCommand, report: (line: string) => void) {
    this.install = install;
    this.layout = layout;
    this.npm = npm;
    this.report = report;
    this.root = root;
  }

  public async runAsync(): Promise<number> {
    try {
      const chosen = new Map<string, string>();
      for (const [name, ranges] of await this.readRangesAsync()) {
        const version = await this.newestAsync(name, ranges);
        if (version === undefined)
          return Resources.failureExitCode;
        chosen.set(name, version);
      }
      if (chosen.size === 0)
        return Resources.successExitCode;
      const manifest = RootManifest.parse(await readFile(path.join(this.root, Resources.manifestFile), Resources.textEncoding));
      const together = [...chosen.values()].reduce((found, t) => VersionRange.isNewer(t, found) ? t : found);
      for (const name of manifest.pins.keys())
        if (name.startsWith(Resources.contextPrefix) && !chosen.has(name))
          chosen.set(name, together);
      const kept = await this.install.readKeptAsync(new Set(chosen.keys()));
      const moved = [...chosen].map(([name, version]) => Resources.formatPackageSpec(name, version));
      const result = await this.npm.runAsync([...Resources.installArguments, ...moved, ...kept], this.root);
      if (!result.isSuccessful) {
        this.report(Resources.formatPeerMoveFailed(result.exitCode, result.text));
        return Resources.failureExitCode;
      }
      let failed = 0;
      for (const [name, version] of chosen) {
        const installed = await this.readInstalledAsync(name);
        if (installed === version)
          this.report(Resources.formatPeerMoved(name, version));
        else {
          this.report(Resources.formatPeerNotMoved(name, String(installed), version));
          failed++;
        }
      }
      return failed === 0 ? Resources.successExitCode : Resources.failureExitCode;
    }
    catch (error) {
      if (!(error instanceof ProcessException || error instanceof PackageException))
        throw error;
      this.report(error.message);
      return Resources.failureExitCode;
    }
  }

  private static fieldsOf(json: unknown): ReadonlyMap<string, unknown> {
    return typeof json === "object" && json !== null && !Array.isArray(json) ? new Map<string, unknown>(Object.entries(json)) : new Map<string, unknown>();
  }

  private static parseVersions(name: string, output: string): unknown {
    try {
      return JSON.parse(output);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new PeerVersionsNotJsonException(name, output, error);
    }
  }

  private async readRangesAsync(): Promise<ReadonlyMap<string, readonly string[]>> {
    const ranges = new Map<string, string[]>();
    for (const part of await this.layout.readPartsAsync()) {
      const manifest: unknown = JSON.parse(await readFile(path.join(this.root, part.folder, Resources.manifestFile), Resources.textEncoding));
      for (const [name, range] of PeerMove.fieldsOf(PeerMove.fieldsOf(manifest).get(Resources.peerDependenciesField)))
        if (name.startsWith(Resources.contextPrefix) && typeof range === "string")
          ranges.set(name, [...ranges.get(name) ?? [], range]);
    }
    return ranges;
  }

  private async newestAsync(name: string, ranges: readonly string[]): Promise<string | undefined> {
    const parsed = ranges.map(t => VersionRange.parse(t));
    const holding = parsed.filter(t => t !== null);
    if (holding.length !== parsed.length) {
      for (const range of ranges.filter(t => VersionRange.parse(t) === null))
        this.report(Resources.formatPeerRangeInvalid(Resources.manifestFile, name, range));
      return undefined;
    }
    const result = await this.npm.runAsync([Resources.viewCommand, name, ...Resources.peerVersionsArguments], this.root);
    if (!result.isSuccessful) {
      this.report(Resources.formatPeerVersionsUnread(name, result.exitCode, result.text));
      return undefined;
    }
    const published = PeerMove.parseVersions(name, result.output);
    const versions = (Array.isArray(published) ? published : [published])
      .filter((t: unknown): t is string => typeof t === "string" && Resources.plainVersionPattern.test(t) && holding.every(u => u.holds(t)));
    const newest = versions.reduce<string | undefined>((found, t) => found === undefined || VersionRange.isNewer(t, found) ? t : found, undefined);
    if (newest === undefined)
      this.report(Resources.formatPeerNoVersion(name, [...new Set(ranges)]));
    return newest;
  }

  private async readInstalledAsync(name: string): Promise<unknown> {
    const file = path.join(this.root, Resources.dependenciesFolder, ...name.split(Resources.pathSeparator), Resources.manifestFile);
    try {
      return PeerMove.fieldsOf(JSON.parse(await readFile(file, Resources.textEncoding))).get(Resources.versionField);
    }
    catch (error) {
      if (!(error instanceof SyntaxError || error instanceof Error && Resources.errorCodeField in error && Resources.missingFileCodes.includes(String(error[Resources.errorCodeField]))))
        throw error;
      throw new PeerManifestUnreadableException(name, file, error);
    }
  }
}
