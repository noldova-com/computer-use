/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { MacBackend } from "@noldova/computer-use.runtime/macos";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend", () => {
  it("finds the outermost app bundle that holds the program, or none", () => {
    assert.equal(MacBackend.hostPathOf("/Applications/Example.app/Contents/Frameworks/Example Helper.app/Contents/MacOS/Example Helper"), "/Applications/Example.app");
    assert.equal(MacBackend.hostPathOf("/Applications/Example.app"), "/Applications/Example.app");
    assert.equal(MacBackend.hostPathOf("/usr/local/bin/node"), "");
  });

  it("builds over osascript running the module's script, without starting it", () => {
    const starter = new ProgramStarterDouble();
    assert.equal(MacBackend.load(starter) instanceof MacBackend, true);
    assert.deepEqual(starter.requests, []);
    assert.match(MacBackend.scriptFile, /[\\/]@noldova[\\/]computer-use\.runtime[\\/]jxa[\\/]mac-desktop\.js$/u);
    assert.equal(fs.existsSync(MacBackend.scriptFile), true);
  });

  it("runs the script's copy outside a packaged app's archive, and the script beside the code elsewhere", () => {
    const resources = path.resolve("/Applications/Example.app/Contents/Resources");
    const runtime = path.join("node_modules", "@noldova", "computer-use.runtime");
    const checkout = path.resolve("/work/computer-use/src/noldova.computer-use.runtime");
    const backend = path.join("src", "services", "mac-backend.js");
    const script = path.join("jxa", "mac-desktop.js");

    assert.equal(MacBackend.scriptFileOf(pathToFileURL(path.join(resources, "app.asar", runtime, backend)).href), path.join(resources, "app.asar.unpacked", runtime, script));
    assert.equal(MacBackend.scriptFileOf(pathToFileURL(path.join(checkout, backend)).href), path.join(checkout, script));
  });

  it("lists the script among the package's files a packaged app keeps outside its archive", () => {
    const folder = path.resolve(path.dirname(MacBackend.scriptFile), "..");
    const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));
    assert.ok(typeof manifest === "object" && manifest !== null && "noldovaDesktop" in manifest);
    const desktop = manifest.noldovaDesktop;
    assert.ok(typeof desktop === "object" && desktop !== null && "unpacked" in desktop);

    assert.deepEqual(desktop.unpacked, ["jxa/mac-desktop.js"]);
    assert.equal(path.join(folder, "jxa", "mac-desktop.js"), MacBackend.scriptFile);
  });

  it("closes its input process", async () => {
    const { channel, backend } = MacBackendHarness.start();

    await backend.closeAsync();

    assert.equal(channel.closeCount, 1);
  });
});
