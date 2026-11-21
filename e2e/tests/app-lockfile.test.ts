/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JsonReader } from "@noldova/context.json";

import { AppLockfile } from "../fixtures/app-lockfile.ts";

const MODULE = "@noldova/computer-use";
const RUNTIME = "@noldova/computer-use.runtime";
const ARCHIVE = { version: "0.0.9", resolved: "file:../../_packages/noldova-computer-use-0.0.9.tgz" };

const LOCK = {
  name: "computer-use-test-app",
  lockfileVersion: 3,
  requires: true,
  packages: {
    "": { name: "computer-use-test-app", workspaces: ["src/window"], dependencies: { [MODULE]: "file:../../_packages/noldova-computer-use-0.0.8.tgz" } },
    [`node_modules/${MODULE}`]: { version: "0.0.8", resolved: "file:../../_packages/noldova-computer-use-0.0.8.tgz", integrity: "sha512-old", license: "MIT", dependencies: { "@noldova/desktop.runtime": "0.0.10" } },
    [`node_modules/${MODULE}/node_modules/${RUNTIME}`]: { version: "0.0.8", resolved: "file:../../_packages/noldova-computer-use.runtime-0.0.8.tgz", integrity: "sha512-old" },
    "node_modules/@noldova/desktop.runtime": { version: "0.0.10", resolved: "https://npm.pkg.github.com/desktop.runtime-0.0.10.tgz", integrity: "sha512-kept" },
    "node_modules/electron": { version: "44.9.1", resolved: "https://registry.npmjs.org/electron/-/electron-44.9.1.tgz", integrity: "sha512-kept", dev: true }
  }
};

function rewrite(dependencies: Readonly<Record<string, string>>, archives: ReadonlyMap<string, typeof ARCHIVE>): JsonReader {
  return JsonReader.parse(AppLockfile.rewrite(JSON.stringify(LOCK), dependencies, archives));
}

describe("AppLockfile.rewrite", () => {
  it("points the module's entries at this run's archives, without the old archives' checksums", () => {
    const runtime = { version: "0.0.9", resolved: "file:../../_packages/noldova-computer-use.runtime-0.0.9.tgz" };
    const packages = rewrite({ [MODULE]: ARCHIVE.resolved }, new Map([[MODULE, ARCHIVE], [RUNTIME, runtime]])).readObject("packages");

    assert.deepEqual(packages.readObject(`node_modules/${MODULE}`).toJson(), { version: "0.0.9", resolved: ARCHIVE.resolved, license: "MIT", dependencies: { "@noldova/desktop.runtime": "0.0.10" } });
    assert.deepEqual(packages.readObject(`node_modules/${MODULE}/node_modules/${RUNTIME}`).toJson(), runtime);
  });

  it("keeps every third-party entry as locked and sets the root's dependencies to the manifest's", () => {
    const dependencies = { [MODULE]: ARCHIVE.resolved, "@noldova/desktop.runtime": "0.0.10" };

    assert.deepEqual(rewrite(dependencies, new Map([[MODULE, ARCHIVE]])).toJson(), {
      ...LOCK,
      packages: {
        ...LOCK.packages,
        "": { ...LOCK.packages[""], dependencies },
        [`node_modules/${MODULE}`]: { version: "0.0.9", resolved: ARCHIVE.resolved, license: "MIT", dependencies: { "@noldova/desktop.runtime": "0.0.10" } }
      }
    });
  });

  it("changes only the root's dependencies when no archive is given", () => {
    const dependencies = { [MODULE]: "0.0.8" };

    assert.deepEqual(rewrite(dependencies, new Map()).toJson(), { ...LOCK, packages: { ...LOCK.packages, "": { ...LOCK.packages[""], dependencies } } });
  });
});
