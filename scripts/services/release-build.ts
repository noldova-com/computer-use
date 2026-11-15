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

import { RootManifest } from "../models/root-manifest.ts";
import { Resources } from "../resources.ts";

export class ReleaseBuild {
  private readonly checkRelease: (version: string, commit: string) => Promise<number>;
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, report: (line: string) => void, checkRelease: (version: string, commit: string) => Promise<number>) {
    this.checkRelease = checkRelease;
    this.report = report;
    this.root = root;
  }

  public async checkVersionAsync(): Promise<number> {
    const version = await this.readVersionAsync();
    const released = await this.readReleasedVersionAsync();
    if (released === version)
      return Resources.successExitCode;

    this.report(Resources.formatVersionMismatch(released, version));
    return Resources.failureExitCode;
  }

  public async checkArchivesAsync(commit: string | null): Promise<number> {
    return commit === null ? Resources.successExitCode : await this.checkRelease(await this.readVersionAsync(), commit);
  }

  private async readVersionAsync(): Promise<string> {
    return RootManifest.parse(await readFile(path.join(this.root, Resources.manifestFile), Resources.textEncoding)).productVersion;
  }

  private async readReleasedVersionAsync(): Promise<unknown> {
    const file = path.join(this.root, Resources.versionFile);
    const text = existsSync(file) ? await readFile(file, Resources.textEncoding) : Resources.jsonNull;
    let content: unknown;
    try {
      content = JSON.parse(text);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      return undefined;
    }

    return typeof content === "object" && content !== null ? Object.entries(content).find(([field]) => field === Resources.versionField)?.[1] : undefined;
  }
}
