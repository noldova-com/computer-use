/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { Resources } from "./resources.ts";
import { ProcessRunner } from "./services/process-runner.ts";
import { TestRun } from "./services/test-run.ts";

process.exitCode = await new TestRun(path.dirname(import.meta.dirname), new ProcessRunner(), t => console.error(t)).timeAsync(process.argv.slice(Resources.argumentsStart));
