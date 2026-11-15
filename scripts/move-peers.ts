/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { NpmCommand } from "./services/npm-command.ts";
import { PackageInstall } from "./services/package-install.ts";
import { PackageLayout } from "./services/package-layout.ts";
import { PeerMove } from "./services/peer-move.ts";
import { ProcessRunner } from "./services/process-runner.ts";

const root = path.dirname(import.meta.dirname);
const npm = new NpmCommand(new ProcessRunner(), process.env);
const report = (line: string): void => console.error(line);
process.exitCode = await new PeerMove(root, new PackageLayout(root), new PackageInstall(root, npm, report), npm, report).runAsync();
