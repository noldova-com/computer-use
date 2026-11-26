/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { glob, readFile } from "node:fs/promises";
import path from "node:path";

import type { ChecksRow } from "../models/checks-row.ts";
import { Resources } from "../resources.ts";

export class TestWaitCheck {
  private readonly root: string;
  private readonly listed: readonly ChecksRow[];
  private readonly report: (line: string) => void;

  public constructor(root: string, listed: readonly ChecksRow[], report: (line: string) => void) {
    this.root = root;
    this.listed = listed;
    this.report = report;
  }

  private static findPauses(text: string): readonly number[] {
    const lines = new Set<number>();
    for (const pattern of Resources.testWaitPauses)
      for (const match of text.matchAll(pattern))
        if (!TestWaitCheck.isInString(text, match.index))
          lines.add(text.slice(0, match.index).split(Resources.lineBreak).length);

    return [...lines].sort((first, second) => first - second);
  }

  private static isInString(text: string, index: number): boolean {
    const lineStart = text.lastIndexOf(Resources.lineBreak, index - 1) + 1;
    let quote: string | null = null;
    for (let position = lineStart; position < index; position++) {
      const character = text.charAt(position);
      if (quote === null) {
        if (Resources.testWaitQuotes.includes(character))
          quote = character;
      }
      else if (character === Resources.testWaitEscape)
        position++;
      else if (character === quote)
        quote = null;
    }

    return quote !== null;
  }

  public async runAsync(): Promise<readonly string[]> {
    const listed = new Set(this.listed.map(t => t.file));
    const files: string[] = [];
    for await (const file of glob(Resources.testWaitFiles, { cwd: this.root, exclude: Resources.testWaitSkipped }))
      files.push(file.replaceAll(path.sep, Resources.pathSeparator));
    files.sort();
    const pausing = new Set<string>();
    const findings: string[] = [];
    for (const file of files) {
      const lines = TestWaitCheck.findPauses(await readFile(path.join(this.root, file), Resources.textEncoding));
      if (lines.length > 0)
        pausing.add(file);
      if (!listed.has(file))
        findings.push(...lines.map(t => Resources.formatTestWaitPause(file, t)));
    }
    for (const row of this.listed)
      if (!pausing.has(row.file))
        findings.push(Resources.formatTestWaitStale(row.line, row.file));
    this.report(Resources.formatTestWaitChecked(files.length, this.listed.length));

    return findings;
  }
}
