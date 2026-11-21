/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { RuntimePart } from "@noldova/computer-use/runtime";
import { RuntimePart as PartRuntimePart } from "@noldova/computer-use.runtime";

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStrings(value: unknown): value is Readonly<Record<string, string>> {
  return isObject(value) && Object.values(value).every(t => typeof t === "string");
}

async function readJsonAsync(file: string): Promise<Readonly<Record<string, unknown>>> {
  const value: unknown = JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  if (!isObject(value))
    throw new TypeError(`${file} holds no JSON object.`);
  return value;
}

function stringsOf(manifest: Readonly<Record<string, unknown>>, field: string): Readonly<Record<string, string>> {
  const value = manifest[field];
  if (!isStrings(value))
    throw new TypeError(`The manifest's ${field} is not an object of strings.`);
  return value;
}

function stringOf(manifest: Readonly<Record<string, unknown>>, field: string): string {
  const value = manifest[field];
  if (typeof value !== "string")
    throw new TypeError(`The manifest's ${field} is not a string.`);
  return value;
}

function importsOf(source: string): string[] {
  return [...source.matchAll(/^\s*(?:import\s+["']([^"']+)["']|(?:import|export)\b[^;"'`]*?\bfrom\s*["']([^"']+)["'])/gm)].map(t => t[1] ?? t[2] ?? "");
}

function rangeFrom(lowest: string): string {
  const [major, minor] = lowest.split(".");
  return `>=${lowest} <${major === "0" ? `0.${String(Number(minor) + 1)}.0` : `${String(Number(major) + 1)}.0.0`}`;
}

function lowestOf(range: string): string {
  const lowest = /^>=(\d+\.\d+\.\d+) /.exec(range)?.[1];
  if (lowest === undefined)
    throw new TypeError(`${range} is not a range of Noldova Desktop versions.`);
  return lowest;
}

function numbersOf(version: string): readonly number[] {
  return version.split(".").map(t => Number(t));
}

function compare(left: string, right: string): number {
  const [a, b] = [numbersOf(left), numbersOf(right)];
  return a.map((t, i) => t - (b[i] ?? 0)).find(t => t !== 0) ?? 0;
}

function isInside(version: string, range: string): boolean {
  const upper = range.split(" <")[1] ?? "";
  return compare(version, lowestOf(range)) >= 0 && compare(version, upper) < 0;
}

function packageOf(specifier: string): string {
  return specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
}

describe("The module package", () => {
  it("gives Noldova Desktop the runtime part's class, which it constructs with no arguments", () => {
    assert.equal(RuntimePart, PartRuntimePart);
    assert.equal(new RuntimePart().constructor, PartRuntimePart);
  });

  it("runs on Windows and macOS only, so Noldova Desktop shows it as unavailable on Linux rather than failing its activation", async () => {
    assert.deepEqual((await readJsonAsync("module.json"))["platforms"], ["windows", "macos"]);
  });

  it("declares the module at its package's version, which Noldova Desktop requires", async () => {
    const manifest = await readJsonAsync("package.json");
    const declaration = await readJsonAsync("module.json");

    assert.deepEqual([declaration["id"], declaration["version"]], ["computer-use", manifest["version"]]);
  });

  it("accepts the Noldova Desktop versions from its lowest to the next that may break modules, as Noldova Desktop's module contract writes them, and builds against Noldova Desktop inside that range", async () => {
    const range = stringOf(await readJsonAsync("module.json"), "noldovaDesktop");
    const pins = Object.entries(stringsOf(await readJsonAsync("../../package.json"), "devDependencies")).filter(t => t[0].startsWith("@noldova/desktop."));

    assert.equal(range, rangeFrom(lowestOf(range)));
    assert.deepEqual(pins.map(t => t[0]), ["@noldova/desktop.protocol", "@noldova/desktop.runtime", "@noldova/desktop.window"]);
    assert.deepEqual(pins.filter(t => !isInside(t[1], range)), []);
  });

  it("finds a Noldova Desktop version inside a range from its lowest up to, but not at, its end, by each part's number", () => {
    assert.deepEqual(["0.0.71", "0.0.72", "0.0.73", "0.0.100", "0.1.0", "0.10.0", "1.0.0"].map(t => isInside(t, ">=0.0.72 <0.1.0")),
      [false, true, true, true, false, false, false]);
  });

  it("writes a range up to the next minor below 1.0 and up to the next major from 1.0", () => {
    assert.deepEqual(["0.0.72", "0.3.9", "1.2.0", "12.0.4"].map(t => rangeFrom(t)), [">=0.0.72 <0.1.0", ">=0.3.9 <0.4.0", ">=1.2.0 <2.0.0", ">=12.0.4 <13.0.0"]);
  });

  it("depends only on its own parts and takes Noldova Desktop's runtime and protocol packages as peers in its range, and no other, so an app's root install holds no Angular, its runtime part's context peers each a range from a version at or below the installed one", async () => {
    const manifest = await readJsonAsync("package.json");
    const runtime = await readJsonAsync("../noldova.computer-use.runtime/package.json");
    const core = (await readJsonAsync("module.json"))["noldovaDesktop"];

    assert.deepEqual(manifest["dependencies"], {
      "@noldova/computer-use.runtime": manifest["version"],
      "@noldova/computer-use.window": manifest["version"]
    });
    assert.equal(manifest["optionalDependencies"], undefined);
    assert.deepEqual(manifest["peerDependencies"], { "@noldova/desktop.protocol": core, "@noldova/desktop.runtime": core });
    assert.equal(manifest["peerDependenciesMeta"], undefined);
    const peers = stringsOf(runtime, "peerDependencies");
    const context = ["@noldova/context.exceptions", "@noldova/context.json"];
    const floors = await Promise.all(context.map(async name => {
      const range = peers[name] ?? "";
      const installed = stringOf(await readJsonAsync(`../../node_modules/${name}/package.json`), "version");
      return [name, range === rangeFrom(lowestOf(range)), compare(lowestOf(range), installed) <= 0];
    }));

    assert.deepEqual(Object.keys(peers).sort(), ["@noldova/desktop.protocol", "@noldova/desktop.runtime", ...context].sort());
    assert.deepEqual([peers["@noldova/desktop.protocol"], peers["@noldova/desktop.runtime"]], [core, core]);
    assert.deepEqual(floors, context.map(name => [name, true, true]));
  });

  for (const file of ["package.json", "../noldova.computer-use.protocol/package.json", "../noldova.computer-use.runtime/package.json", "../noldova.computer-use.window/package.json"])
    it(`names no Noldova Desktop package among ${file}'s dependencies or as its own name, which Noldova Desktop's build keeps for its own`, async () => {
      const manifest = await readJsonAsync(file);
      const names = ["dependencies", "optionalDependencies"].flatMap(field => manifest[field] === undefined ? [] : Object.keys(stringsOf(manifest, field)));

      assert.deepEqual([String(manifest["name"]), ...names].filter(name => name.startsWith("@noldova/desktop.")), []);
    });

  const sourceTrees: readonly (readonly [string, string])[] = [
    ["package.json", "api"],
    ["../noldova.computer-use.protocol/package.json", "../noldova.computer-use.protocol/src"],
    ["../noldova.computer-use.runtime/package.json", "../noldova.computer-use.runtime/src"],
    ["../noldova.computer-use.window/package.json", "../noldova.computer-use.window/src"]
  ];
  for (const [file, sources] of sourceTrees)
    it(`imports from ${sources} by name only itself, its dependencies, its peers and Node's own modules, which a strict install resolves`, async () => {
      const manifest = await readJsonAsync(file);
      const declared = new Set([String(manifest["name"]), ...["dependencies", "peerDependencies"]
        .flatMap(field => manifest[field] === undefined ? [] : Object.keys(stringsOf(manifest, field)))]);
      const folder = new URL(`../${sources}/`, import.meta.url);
      const files = (await readdir(folder, { recursive: true })).filter(t => t.endsWith(".ts"));
      const undeclared: string[] = [];
      for (const name of files)
        for (const specifier of importsOf(await readFile(new URL(name.replaceAll("\\", "/"), folder), "utf8")))
          if (!specifier.startsWith(".") && !specifier.startsWith("node:") && !declared.has(packageOf(specifier)))
            undeclared.push(`${name}: ${specifier}`);

      assert.deepEqual(undeclared, []);
    });

  it("finds each import and re-export by name, and no call that only looks like one", () => {
    const source = [
      "import { a } from \"@scope/one\";",
      "import type { B } from \"@scope/two/deep\";",
      "export { c } from \"three\";",
      "import \"four/setup\";",
      "import {\n  d\n} from \"./local.ts\";",
      "ObjC.import(\"AppKit\");",
      "const text = \"import x from 'not-code'\";"
    ].join("\n");

    assert.deepEqual(importsOf(source), ["@scope/one", "@scope/two/deep", "three", "four/setup", "./local.ts"]);
    assert.deepEqual(["@scope/two/deep", "four/setup", "five"].map(t => packageOf(t)), ["@scope/two", "four", "five"]);
  });

  it("names the window part after the module package with .window, an Angular package whose peers are optional, from the window workspace's Angular to its next major and in the module's range", async () => {
    const manifest = await readJsonAsync("package.json");
    const part = await readJsonAsync("../noldova.computer-use.window/package.json");
    const core = await readJsonAsync("../../node_modules/@noldova/desktop.window/package.json");
    const pinned = stringsOf(core, "peerDependencies");

    assert.equal(part["name"], `${String(manifest["name"])}.window`);
    assert.deepEqual(part["peerDependencies"], { "@angular/core": rangeFrom(pinned["@angular/core"] ?? ""), "@noldova/desktop.window": (await readJsonAsync("module.json"))["noldovaDesktop"] });
    assert.deepEqual(part["peerDependenciesMeta"], { "@angular/core": { optional: true }, "@noldova/desktop.window": { optional: true } });
  });
});
