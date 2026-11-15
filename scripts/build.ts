/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { Resources } from "./resources.ts";
import { NpmCommand } from "./services/npm-command.ts";
import { PackageLayout } from "./services/package-layout.ts";
import { PackagePacker } from "./services/package-packer.ts";
import { ProcessRunner } from "./services/process-runner.ts";
import { WorkspaceBuild } from "./services/workspace-build.ts";

const root = path.dirname(import.meta.dirname);
const layout = new PackageLayout(root);
const runner = new ProcessRunner();
const report = (line: string): void => console.error(line);
const options = process.argv.slice(Resources.argumentsStart);

if (options.includes(Resources.listCopiesOption)) {
  if (options.length !== 1) {
    report(Resources.formatListCopiesAlone(Resources.listCopiesOption));
    process.exitCode = Resources.failureExitCode;
  }
  else {
    for (const copy of PackagePacker.listCopies(root, await layout.readPartsAsync()))
      process.stdout.write(Resources.formatCopy(copy.source, copy.packageName, copy.path));
    process.stdout.write(`${Resources.copiesEnd}${Resources.lineBreak}`);
  }
}
else if (!existsSync(path.join(root, Resources.dependenciesFolder)) && (process.env[Resources.npmPathVariable] ?? "").length === 0) {
  report(Resources.runThroughNpm);
  process.exitCode = Resources.failureExitCode;
}
else
  process.exitCode = await new WorkspaceBuild(root, layout, runner, new NpmCommand(runner, process.env), process.env, report).runAsync();
