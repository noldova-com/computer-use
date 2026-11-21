/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { JsonReader, type JsonObject } from "@noldova/context.json";

import { AppLock } from "../fixtures/app-lock.ts";
import { TestAppLayout } from "../fixtures/test-app-layout.ts";

const MODULE = "@noldova/computer-use";
const WORKSPACE = "src/computer-use-test.window.app";

async function readTemplateAsync(name: string): Promise<JsonObject> {
  return (await AppLock.readAsync(path.join(TestAppLayout.TEMPLATE_FOLDER, name))).toJson();
}

async function copyTemplateAsync(t: TestContext, manifest: (json: JsonObject) => JsonObject, workspace: (json: JsonObject) => JsonObject): Promise<string> {
  const folder = await mkdtemp(path.join(os.tmpdir(), "noldova-computer-use-lock-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  await mkdir(path.join(folder, WORKSPACE), { recursive: true });
  await writeFile(path.join(folder, AppLock.MANIFEST), JSON.stringify(manifest(await readTemplateAsync(AppLock.MANIFEST))));
  await writeFile(path.join(folder, AppLock.LOCKFILE), await readFile(path.join(TestAppLayout.TEMPLATE_FOLDER, AppLock.LOCKFILE), "utf8"));
  await writeFile(path.join(folder, WORKSPACE, AppLock.MANIFEST), JSON.stringify(workspace(await readTemplateAsync(path.join(WORKSPACE, AppLock.MANIFEST)))));
  return folder;
}

function withPin(json: JsonObject, field: string, name: string, version: string): JsonObject {
  return { ...json, [field]: { ...JsonReader.fromValue(json).readObject(field).toJson(), [name]: version } };
}

function lockOf(packages: JsonObject): JsonReader {
  return JsonReader.fromValue({ lockfileVersion: 3, packages });
}

describe("The fixture app's lockfile", () => {
  it("locks every workspace of the app as its manifest pins it, with none of the module's parts, so a new version of a part needs no relock", async () => {
    const lock = JsonReader.fromValue(await readTemplateAsync(AppLock.LOCKFILE));

    assert.deepEqual(await AppLock.staleWorkspacesAsync(TestAppLayout.TEMPLATE_FOLDER), []);
    assert.equal(lock.readObject("packages").hasField(WORKSPACE), true);
    assert.deepEqual(Object.keys(lock.readObject("packages").toJson()).filter(t => t.includes(MODULE)), []);
  });

  it("names the window app's workspace when its manifest moves a pin the lockfile doesn't hold", async t => {
    const folder = await copyTemplateAsync(t, json => json, json => withPin(json, "dependencies", "@angular/core", "22.3.1"));

    assert.deepEqual(await AppLock.staleWorkspacesAsync(folder), [WORKSPACE]);
  });

  it("names the app's root when its manifest adds a pin the lockfile doesn't hold", async t => {
    const folder = await copyTemplateAsync(t, json => withPin(json, "devDependencies", "left-pad", "1.3.0"), json => json);

    assert.deepEqual(await AppLock.staleWorkspacesAsync(folder), [""]);
  });

  it("names a workspace the lockfile has no entry for", async t => {
    const folder = await copyTemplateAsync(t, json => ({ ...json, workspaces: [WORKSPACE, "src/other.app"] }), json => json);
    await mkdir(path.join(folder, "src", "other.app"));
    await writeFile(path.join(folder, "src", "other.app", AppLock.MANIFEST), JSON.stringify({ name: "other-app" }));

    assert.deepEqual(await AppLock.staleWorkspacesAsync(folder), ["src/other.app"]);
  });
});

describe("The install's changes to the locked packages", () => {
  const own = new Set([MODULE, `${MODULE}.protocol`]);
  const locked = {
    "": { dependencies: { a: "1.0.0" } },
    "node_modules/a": { version: "1.0.0", resolved: "https://registry.npmjs.org/a/-/a-1.0.0.tgz", integrity: "sha512-a" },
    "node_modules/b": { version: "2.0.0", resolved: "https://registry.npmjs.org/b/-/b-2.0.0.tgz", integrity: "sha512-b" },
    "node_modules/app": { resolved: "src/app", link: true },
    "src/app": { version: "0.0.1" },
    "src/app/node_modules/c": { version: "3.0.0", resolved: "https://registry.npmjs.org/c/-/c-3.0.0.tgz", integrity: "sha512-c" }
  };

  it("names none when the install only adds the module's parts and changes the root and workspace entries", () => {
    assert.deepEqual(AppLock.changedEntries(lockOf(locked), lockOf({
      ...locked,
      "": { dependencies: { a: "1.0.0", [MODULE]: "0.0.2" } },
      "src/app": { version: "0.0.2" },
      [`node_modules/${MODULE}`]: { version: "0.0.2", resolved: "file:computer-use-0.0.2.tgz" },
      [`node_modules/${MODULE}.protocol`]: { version: "0.0.2", resolved: "file:computer-use.protocol-0.0.2.tgz" }
    }), own), []);
  });

  it("names each locked package the install moved, re-resolved or dropped, a workspace's own included", () => {
    assert.deepEqual(AppLock.changedEntries(lockOf(locked), lockOf({
      "": locked[""],
      "node_modules/a": { ...locked["node_modules/a"], version: "1.0.1" },
      "node_modules/app": { ...locked["node_modules/app"], resolved: "src/other" },
      "src/app": locked["src/app"],
      "src/app/node_modules/c": { ...locked["src/app/node_modules/c"], integrity: "sha512-other" }
    }), own), ["node_modules/a", "node_modules/b", "node_modules/app", "src/app/node_modules/c"]);
  });

  it("names each package the install added that the lockfile doesn't hold, at the top, under a part or under a workspace", () => {
    assert.deepEqual(AppLock.changedEntries(lockOf(locked), lockOf({
      ...locked,
      [`node_modules/${MODULE}`]: { version: "0.0.2", resolved: "file:computer-use-0.0.2.tgz" },
      "node_modules/d": { version: "4.0.0", resolved: "https://registry.npmjs.org/d/-/d-4.0.0.tgz", integrity: "sha512-d" },
      [`node_modules/${MODULE}/node_modules/e`]: { version: "5.0.0", resolved: "https://registry.npmjs.org/e/-/e-5.0.0.tgz", integrity: "sha512-e" },
      "src/app/node_modules/f": { version: "6.0.0", resolved: "https://registry.npmjs.org/f/-/f-6.0.0.tgz", integrity: "sha512-f" }
    }), own), ["node_modules/d", `node_modules/${MODULE}/node_modules/e`, "src/app/node_modules/f"]);
  });
});
