/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { JsonReader } from "@noldova/context.json";

import { TestAppLayout } from "../fixtures/test-app-layout.ts";

const MODULE = "@noldova/computer-use";

async function readTemplateAsync(name: string): Promise<JsonReader> {
  return JsonReader.parse(await readFile(path.join(TestAppLayout.TEMPLATE_FOLDER, name), "utf8"));
}

describe("The fixture app's lockfile", () => {
  it("locks the app's own manifest, with none of the module's parts, so a new version of a part needs no relock", async () => {
    const manifest = await readTemplateAsync("package.json");
    const lock = await readTemplateAsync("package-lock.json");
    const packages = lock.readObject("packages");
    const root = packages.readObject("");

    assert.deepEqual([root.readObject("dependencies").toJson(), root.readObject("devDependencies").toJson()],
      [manifest.readObject("dependencies").toJson(), manifest.readObject("devDependencies").toJson()]);
    assert.deepEqual(Object.keys(packages.toJson()).filter(t => t.includes(MODULE)), []);
  });
});
