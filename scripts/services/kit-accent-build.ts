/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { Resources } from "../resources.ts";
import { PackageLayout } from "./package-layout.ts";

export class KitAccentBuild {
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, report: (line: string) => void) {
    this.report = report;
    this.root = root;
  }

  private static readAccent(theme: string): string | null {
    const block = Resources.cssRootBlockPattern.exec(theme.replace(Resources.cssCommentPattern, ""))?.[1];
    return block === undefined ? null : Resources.kitAccentPattern.exec(block)?.[1]?.toUpperCase() ?? null;
  }

  public async runAsync(parts: readonly IPackagePart[]): Promise<number> {
    const targets: string[] = [];
    for (const part of parts) {
      const target = await this.readTargetAsync(part);
      if (target !== null)
        targets.push(path.join(PackageLayout.stagingOf(this.root, part), target));
    }
    if (targets.length === 0)
      return Resources.successExitCode;

    const themeFile = path.join(this.root, ...Resources.kitThemeSegments);
    const accent = existsSync(themeFile) ? KitAccentBuild.readAccent(await readFile(themeFile, Resources.textEncoding)) : null;
    if (accent === null) {
      this.report(Resources.formatKitAccentMissing(Resources.kitThemeSegments.join(Resources.pathSeparator)));
      return Resources.failureExitCode;
    }
    for (const target of targets) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, `${JSON.stringify({ color: accent })}${Resources.lineBreak}`);
    }

    return Resources.successExitCode;
  }

  private async readTargetAsync(part: IPackagePart): Promise<string | null> {
    const manifest: unknown = JSON.parse(await readFile(path.join(this.root, part.folder, Resources.manifestFile), Resources.textEncoding));
    const target = KitAccentBuild.fieldOf(KitAccentBuild.fieldOf(manifest, Resources.noldovaField), Resources.kitAccentField);

    return typeof target === "string" ? target : null;
  }

  private static fieldOf(json: unknown, field: string): unknown {
    return typeof json === "object" && json !== null ? Object.entries(json).find(([name]) => name === field)?.[1] : undefined;
  }
}
