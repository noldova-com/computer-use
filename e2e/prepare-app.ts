/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { JsonReader, type JsonObject } from "@noldova/context.json";

import { AppLock } from "./fixtures/app-lock.ts";
import { PlainIcons } from "./fixtures/icons/plain-icons.ts";
import { PackedPart } from "./fixtures/packed-part.ts";
import { TestAppLayout } from "./fixtures/test-app-layout.ts";

class FixtureAppPreparation {
  private static readonly MODULE_PACKAGE: string = "@noldova/computer-use";
  private static readonly PART_FOLDERS: readonly string[] = ["noldova.computer-use", "noldova.computer-use.protocol", "noldova.computer-use.runtime", "noldova.computer-use.window"];
  private static readonly MANIFEST: string = "package.json";
  private static readonly LOCKFILE: string = "package-lock.json";
  private static readonly NPM_PATH_VARIABLE: string = "npm_execpath";
  private static readonly NO_NPM: string = "Run the preparation through npm run, which names npm's own script in npm_execpath.";
  private static readonly NO_LOCKFILE: string = "e2e/app/package-lock.json is missing, so the app's install would take the newest versions in range; run npm run test:e2e:lock, which writes it, and commit it.";
  private static readonly LOCK_COMMAND: string = "lock";
  private static readonly LOCK_ONLY: readonly string[] = ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"];
  private static readonly INSTALL_FROM_ARCHIVES: readonly string[] = ["install", "--ignore-scripts", "--no-audit", "--no-fund"];
  private static readonly APP_STEPS: readonly (readonly string[])[] = [["run", "install:app"], ["run", "build:app"], ["run", "desktop-tools", "--", "help"]];

  private readonly npm: string;
  private readonly isLocking: boolean;

  private constructor(npm: string, isLocking: boolean) {
    this.npm = npm;
    this.isLocking = isLocking;
  }

  public static async runAsync(): Promise<void> {
    const npm = process.env[FixtureAppPreparation.NPM_PATH_VARIABLE];
    if (npm === undefined || npm === "")
      throw new Error(FixtureAppPreparation.NO_NPM);
    await new FixtureAppPreparation(npm, process.argv[2] === FixtureAppPreparation.LOCK_COMMAND).prepareAsync();
  }

  private static formatStale(workspaces: readonly string[]): string {
    const names = workspaces.map(t => t === "" ? "e2e/app/package.json" : `e2e/app/${t}/package.json`).join(", ");
    return `e2e/app/package-lock.json doesn't lock what ${names} pins, so the app's install would resolve those packages afresh; run npm run test:e2e:lock, which relocks it, and commit it.`;
  }

  private static formatChanged(entries: readonly string[]): string {
    return `Installing the module's archives changed or added packages beyond what e2e/app/package-lock.json locks: ${entries.join(", ")}; run npm run test:e2e:lock, which relocks it, and commit it.`;
  }

  private static formatFailure(command: readonly string[], code: number | null): string {
    return `npm ${command.join(" ")} in ${TestAppLayout.APP_FOLDER} ended with ${code === null ? "no exit code" : `exit code ${code}`}.`;
  }

  private async prepareAsync(): Promise<void> {
    await cp(TestAppLayout.TEMPLATE_FOLDER, TestAppLayout.APP_FOLDER, { recursive: true, force: true, filter: t => !t.split(path.sep).includes("node_modules") });
    await copyFile(path.join(TestAppLayout.REPOSITORY_ROOT, "LICENSE"), path.join(TestAppLayout.APP_FOLDER, "LICENSE"));
    await PlainIcons.writeAsync(path.join(TestAppLayout.APP_FOLDER, "assets", "icons"));
    if (this.isLocking) {
      await this.runAsync(FixtureAppPreparation.LOCK_ONLY);
      await copyFile(path.join(TestAppLayout.APP_FOLDER, FixtureAppPreparation.LOCKFILE), path.join(TestAppLayout.TEMPLATE_FOLDER, FixtureAppPreparation.LOCKFILE));
      return;
    }
    if (!existsSync(path.join(TestAppLayout.TEMPLATE_FOLDER, FixtureAppPreparation.LOCKFILE)))
      throw new Error(FixtureAppPreparation.NO_LOCKFILE);
    const stale = await AppLock.staleWorkspacesAsync(TestAppLayout.TEMPLATE_FOLDER);
    if (stale.length > 0)
      throw new Error(FixtureAppPreparation.formatStale(stale));
    const locked = await AppLock.readAsync(path.join(TestAppLayout.APP_FOLDER, FixtureAppPreparation.LOCKFILE));
    const parts = await Promise.all(FixtureAppPreparation.PART_FOLDERS.map(t => PackedPart.readAsync(path.join(TestAppLayout.REPOSITORY_ROOT, "src", t))));
    const template = JsonReader.parse(await readFile(path.join(TestAppLayout.TEMPLATE_FOLDER, FixtureAppPreparation.MANIFEST), "utf8"));
    const dependencies = template.readObject("dependencies").toJson();
    const archives = Object.fromEntries(parts.map(t => [t.name, t.fileSpecifier(TestAppLayout.APP_FOLDER)]));
    await this.writeManifestAsync(template.toJson(), { ...dependencies, ...archives });
    await this.runAsync(FixtureAppPreparation.INSTALL_FROM_ARCHIVES);
    const changed = AppLock.changedEntries(locked, await AppLock.readAsync(path.join(TestAppLayout.APP_FOLDER, FixtureAppPreparation.LOCKFILE)),
      new Set(parts.map(t => t.name)));
    if (changed.length > 0)
      throw new Error(FixtureAppPreparation.formatChanged(changed));
    const module = parts.find(t => t.name === FixtureAppPreparation.MODULE_PACKAGE);
    if (module === undefined)
      throw new Error(`No part folder holds ${FixtureAppPreparation.MODULE_PACKAGE}.`);
    const pinned = { ...dependencies, [module.name]: module.version };
    await this.writeManifestAsync(template.toJson(), pinned);
    await this.pinLockfileAsync(pinned);
    for (const step of FixtureAppPreparation.APP_STEPS)
      await this.runAsync(step);
  }

  private async writeManifestAsync(template: JsonObject, dependencies: JsonObject): Promise<void> {
    await writeFile(path.join(TestAppLayout.APP_FOLDER, FixtureAppPreparation.MANIFEST), `${JSON.stringify({ ...template, dependencies }, null, 2)}\n`);
  }

  private async pinLockfileAsync(dependencies: JsonObject): Promise<void> {
    const file = path.join(TestAppLayout.APP_FOLDER, FixtureAppPreparation.LOCKFILE);
    const lock = JsonReader.parse(await readFile(file, "utf8"));
    const packages = lock.readObject("packages");
    const root = packages.readObject("").toJson();
    await writeFile(file, `${JSON.stringify({ ...lock.toJson(), packages: { ...packages.toJson(), "": { ...root, dependencies } } }, null, 2)}\n`);
  }

  private async runAsync(command: readonly string[]): Promise<void> {
    const child = spawn(process.execPath, [this.npm, ...command], { cwd: TestAppLayout.APP_FOLDER, stdio: "inherit" });
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    if (code !== 0)
      throw new Error(FixtureAppPreparation.formatFailure(command, code));
  }
}

await FixtureAppPreparation.runAsync();
