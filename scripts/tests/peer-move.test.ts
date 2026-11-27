/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import type { IPackagePart } from "../interfaces/i-package-part.ts";
import { ProcessResult } from "../models/process-result.ts";
import { NpmCommand } from "../services/npm-command.ts";
import { PackageInstall } from "../services/package-install.ts";
import { PackageLayout } from "../services/package-layout.ts";
import { PeerMove } from "../services/peer-move.ts";
import { ProcessRunner } from "../services/process-runner.ts";

const PART = "src/noldova.computer-use.runtime";

class RegistryNpm extends NpmCommand {
  public readonly installs: (readonly string[])[] = [];
  private readonly published: ReadonlyMap<string, readonly string[]>;
  private readonly root: string;

  public constructor(root: string, published: ReadonlyMap<string, readonly string[]>) {
    super(new ProcessRunner(), {});
    this.root = root;
    this.published = published;
  }

  public override async runAsync(npmArguments: readonly string[]): Promise<ProcessResult> {
    const [command, name] = npmArguments;
    if (command === "view")
      return new ProcessResult(0, JSON.stringify(this.published.get(name ?? "") ?? []), "");
    const specs = npmArguments.filter(t => t.startsWith("@noldova/"));
    this.installs.push(specs);
    for (const spec of specs) {
      const at = spec.lastIndexOf("@");
      await writeJsonAsync(path.join(this.root, "node_modules", ...spec.slice(0, at).split("/"), "package.json"), { version: spec.slice(at + 1) });
    }
    return new ProcessResult(0, "", "");
  }
}

class OnePartLayout extends PackageLayout {
  public override readPartsAsync(): Promise<readonly IPackagePart[]> {
    return Promise.resolve([{ dependencies: [], expectedName: "@noldova/computer-use.runtime", folder: PART, isModule: false, name: "@noldova/computer-use.runtime", version: "0.0.3" }]);
  }
}

async function writeJsonAsync(file: string, json: object): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(json));
}

async function makeRootAsync(t: TestContext, peers: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "noldova-peer-move-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeJsonAsync(path.join(root, "package.json"), {
    version: "0.0.3",
    devDependencies: { "@noldova/context.exceptions": "0.0.13", "@noldova/context.text": "0.0.13", "@noldova/desktop.runtime": "0.0.17" }
  });
  await writeJsonAsync(path.join(root, PART, "package.json"), { peerDependencies: peers });
  for (const [name, version] of Object.entries({ "context.exceptions": "0.0.13", "context.text": "0.0.13", "desktop.runtime": "0.0.17" }))
    await writeJsonAsync(path.join(root, "node_modules", "@noldova", name, "package.json"), { version });
  return root;
}

async function moveAsync(root: string, published: ReadonlyMap<string, readonly string[]>): Promise<{ exitCode: number; lines: readonly string[]; npm: RegistryNpm }> {
  const npm = new RegistryNpm(root, published);
  const lines: string[] = [];
  const report = (line: string): void => {
    lines.push(line);
  };
  const exitCode = await new PeerMove(root, new OnePartLayout(root), new PackageInstall(root, npm, report), npm, report).runAsync();
  return { exitCode, lines, npm };
}

describe("PeerMove", () => {
  it("moves every context pin to the newest version all of them have published, while a release has reached only some", async t => {
    const root = await makeRootAsync(t, { "@noldova/context.exceptions": ">=0.0.13 <0.1.0" });

    const { exitCode, lines, npm } = await moveAsync(root, new Map([
      ["@noldova/context.exceptions", ["0.0.12", "0.0.13", "0.0.14"]],
      ["@noldova/context.text", ["0.0.12", "0.0.13"]]
    ]));

    assert.equal(exitCode, 0);
    assert.deepEqual(npm.installs, [["@noldova/context.exceptions@0.0.13", "@noldova/context.text@0.0.13", "@noldova/desktop.runtime@0.0.17"]]);
    assert.deepEqual(lines, [
      "Moved @noldova/context.exceptions to 0.0.13, the newest version every context package has published inside the packages' peer ranges.",
      "Moved @noldova/context.text to 0.0.13, the newest version every context package has published inside the packages' peer ranges."
    ]);
  });

  it("moves to the newer version once every context package has published it", async t => {
    const root = await makeRootAsync(t, { "@noldova/context.exceptions": ">=0.0.13 <0.1.0" });

    const { exitCode, npm } = await moveAsync(root, new Map([
      ["@noldova/context.exceptions", ["0.0.13", "0.0.14"]],
      ["@noldova/context.text", ["0.0.13", "0.0.14"]]
    ]));

    assert.equal(exitCode, 0);
    assert.deepEqual(npm.installs, [["@noldova/context.exceptions@0.0.14", "@noldova/context.text@0.0.14", "@noldova/desktop.runtime@0.0.17"]]);
  });

  it("installs nothing and names the packages when no version is published by all of them inside the ranges", async t => {
    const root = await makeRootAsync(t, { "@noldova/context.exceptions": ">=0.0.14 <0.1.0" });

    const { exitCode, lines, npm } = await moveAsync(root, new Map([
      ["@noldova/context.exceptions", ["0.0.13", "0.0.14"]],
      ["@noldova/context.text", ["0.0.13"]]
    ]));

    assert.equal(exitCode, 1);
    assert.deepEqual(npm.installs, []);
    assert.deepEqual(lines, ["npm view gives no version that @noldova/context.exceptions, @noldova/context.text have all published inside the packages' peer ranges."]);
  });

  it("installs nothing and names the range when a package has published no version inside it", async t => {
    const root = await makeRootAsync(t, { "@noldova/context.exceptions": ">=0.0.15 <0.1.0" });

    const { exitCode, lines, npm } = await moveAsync(root, new Map([
      ["@noldova/context.exceptions", ["0.0.13", "0.0.14"]],
      ["@noldova/context.text", ["0.0.13", "0.0.14"]]
    ]));

    assert.equal(exitCode, 1);
    assert.deepEqual(npm.installs, []);
    assert.deepEqual(lines, ["npm view gives no published version of @noldova/context.exceptions inside >=0.0.15 <0.1.0."]);
  });

  it("moves nothing when no part takes a context peer", async t => {
    const root = await makeRootAsync(t, {});

    const { exitCode, lines, npm } = await moveAsync(root, new Map());

    assert.equal(exitCode, 0);
    assert.deepEqual(npm.installs, []);
    assert.deepEqual(lines, []);
  });
});
