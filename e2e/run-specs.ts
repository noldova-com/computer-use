/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { spawn } from "node:child_process";
import path from "node:path";

class SpecRun {
  private static readonly ROOT: string = path.dirname(import.meta.dirname);
  private static readonly COMPILER: string = path.join(SpecRun.ROOT, "node_modules", "typescript", "bin", "tsc");
  private static readonly PLAYWRIGHT: string = path.join(SpecRun.ROOT, "node_modules", "@playwright", "test", "cli.js");
  private static readonly PROJECT: string = path.join("e2e", "tsconfig.json");
  private static readonly NO_CONFIG: string = "Name the Playwright config to run, such as e2e/playwright.config.ts, before any of Playwright's own options.";
  private static readonly FAILURE_CODE: number = 1;

  public static async runAsync(): Promise<number> {
    const [config, ...options] = process.argv.slice(2);
    if (config === undefined || config.startsWith("-")) {
      console.error(SpecRun.NO_CONFIG);
      return SpecRun.FAILURE_CODE;
    }
    const checked = await SpecRun.startAsync([SpecRun.COMPILER, "-p", SpecRun.PROJECT]);
    if (checked !== 0)
      return checked;
    return await SpecRun.startAsync([SpecRun.PLAYWRIGHT, "test", "--config", config, ...options]);
  }

  private static async startAsync(parameters: readonly string[]): Promise<number> {
    const child = spawn(process.execPath, parameters, { cwd: SpecRun.ROOT, stdio: "inherit" });
    return await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", code => resolve(code ?? SpecRun.FAILURE_CODE));
    });
  }
}

process.exitCode = await SpecRun.runAsync();
