/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { describe, it } from "node:test";

import { AppIdentity } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

const NOTES_PATH = WindowsBackendHarness.notesPath;

describe("the Windows backend's apps", () => {
  it("lists each running or installed program once, named by its description and published by its signer", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.appPaths = {
      host: "C:\\Apps\\Host.exe",
      running: [NOTES_PATH, "C:\\Apps\\Host.exe", "relative.exe"],
      installed: ["c:\\apps\\NOTES.exe", "C:\\Tools\\Paint.exe", "C:\\Tools\\Blank.exe"]
    };
    api.programs = new Map([
      [NOTES_PATH, { description: " Notes ", signer: " Example Corp " }],
      ["C:\\Apps\\Host.exe", { description: "Host", signer: null }],
      ["C:\\Tools\\Blank.exe", { description: "  ", signer: "  " }]
    ]);

    const apps = await backend.apps.listAppsAsync(HangGuard.signal());

    assert.deepEqual(apps.map(t => [t.identity.id, t.name, t.publisher, t.isRunning, t.isHost]), [
      ["c:\\apps\\notes.exe", "Notes", "Example Corp", true, false],
      ["c:\\apps\\host.exe", "Host", null, true, true],
      ["c:\\tools\\paint.exe", "Paint", null, false, false],
      ["c:\\tools\\blank.exe", "Blank", null, false, false]
    ]);
  });

  it("reads each program's file once, however often the apps are listed", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.appPaths = { host: "not a path", running: [NOTES_PATH], installed: [] };

    await backend.apps.listAppsAsync(HangGuard.signal());
    const apps = await backend.apps.listAppsAsync(HangGuard.signal());

    assert.deepEqual(api.named("describeProgram"), [[NOTES_PATH]]);
    assert.equal(apps[0]?.isHost, false);
  });

  it("lists nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.apps.listAppsAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });

  it("passes on the addon's failure for a list past its limit of program paths, reading no program's file", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const failure = Object.assign(new RangeError("The running or the installed apps have more than 1,024 program paths, so the list would be incomplete."), { code: "ERR_WINDOWS_DESKTOP" });
    api.listAppPaths = () => {
      throw failure;
    };

    await assert.rejects(backend.apps.listAppsAsync(HangGuard.signal()), (error: unknown) => error === failure);
    assert.deepEqual(api.named("describeProgram"), []);
  });

  it("stops reading programs' files when the call ends during the listing", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const controller = new AbortController();
    api.appPaths = { host: "C:\\Apps\\Host.exe", running: [NOTES_PATH, "C:\\Tools\\Paint.exe"], installed: [] };
    api.programs = new Map([[NOTES_PATH, { description: "Notes", signer: null }]]);
    const describe = api.describeProgram.bind(api);
    const { promise: firstRead, resolve: onFirstRead } = Promise.withResolvers<void>();
    api.describeProgram = t => {
      onFirstRead();

      return describe(t);
    };

    const listing = backend.apps.listAppsAsync(controller.signal);
    await firstRead;
    controller.abort();

    await assert.rejects(listing, { name: "AbortError" });
    assert.deepEqual(api.named("describeProgram"), [[NOTES_PATH]]);
  });

  it("names a program without a description by its file and gives no publisher or icon the file lacks", async () => {
    const { backend } = WindowsBackendHarness.start();
    const program = new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs"));

    const app = await backend.apps.describeAppAsync(program, 64, HangGuard.signal());

    assert.deepEqual([app?.name, app?.publisher, app?.icon], ["complete-addon", null, null]);
  });

  it("describes a program without an icon when its icon can't be read", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const program = new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs"));
    api.programs = new Map([[program.id, { description: "Notes", signer: null }]]);
    api.readProgramIcon = () => {
      throw WindowsBackendHarness.addonFailure("The icon couldn't be read.");
    };

    const app = await backend.apps.describeAppAsync(program, 64, HangGuard.signal());

    assert.deepEqual([app?.name, app?.icon], ["Notes", null]);
  });

  it("fails a description when reading its icon fails other than as the addon", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const program = new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs"));
    const failure = new RangeError("The icon's size broke.");
    api.readProgramIcon = () => {
      throw failure;
    };

    await assert.rejects(backend.apps.describeAppAsync(program, 64, HangGuard.signal()), (error: unknown) => error === failure);
  });

  it("describes no app for a path the system can't even check, and asks the addon nothing", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    assert.equal(await backend.apps.describeAppAsync(new AppIdentity("C:\\Apps\\No\u0000tes.exe"), 64, HangGuard.signal()), null);
    assert.deepEqual(api.calls, []);
  });

  it("fails a description when checking its file fails other than as the system", async t => {
    const defect = new TypeError("A defect in the module.");
    const { api, backend } = WindowsBackendHarness.start();
    try {
      t.mock.method(fsPromises, "stat", () => Promise.reject(defect));
      syncBuiltinESMExports();

      await assert.rejects(backend.apps.describeAppAsync(new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs")), 64, HangGuard.signal()), (error: unknown) => error === defect);
      assert.deepEqual(api.calls, []);
    } finally {
      t.mock.restoreAll();
      syncBuiltinESMExports();
    }
  });

  it("reads a program's file once, whether it was listed or described before", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const program = new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs"));

    await backend.apps.describeAppAsync(program, 64, HangGuard.signal());
    await backend.apps.describeAppAsync(program, 32, HangGuard.signal());

    assert.deepEqual(api.named("describeProgram"), [[program.id]]);
    assert.deepEqual(api.named("readProgramIcon"), [[program.id, 64], [program.id, 32]]);
  });

  it("describes no app for a path with no file, or a folder, and asks the addon nothing", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    assert.equal(await backend.apps.describeAppAsync(new AppIdentity(WindowsBackendHarness.fixture("absent.exe")), 64, HangGuard.signal()), null);
    assert.equal(await backend.apps.describeAppAsync(new AppIdentity(WindowsBackendHarness.fixture("")), 64, HangGuard.signal()), null);
    assert.deepEqual(api.calls, []);
  });

  it("describes nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.apps.describeAppAsync(new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs")), 64, AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });
});
