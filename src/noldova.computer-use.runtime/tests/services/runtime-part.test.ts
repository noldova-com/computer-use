/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { AppDescription, AppsService, Display, RuntimePart } from "@noldova/computer-use.runtime";
import { MacBackend } from "@noldova/computer-use.runtime/macos";
import { WindowsBackend } from "@noldova/computer-use.runtime/windows";
import { SettingKind } from "@noldova/desktop.protocol";
import { ModuleDeclaration, PermissionDecision, PermissionOption, ToolFailureCode } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";
import { RecordingPermissionCenter } from "../doubles/recording-permission-center.fixture.ts";
import { RuntimePartContextDouble } from "../doubles/runtime-part-context-double.fixture.ts";
import { HangGuard } from "./hang-guard.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("RuntimePart", () => {
  const enabledSetting = "computer-use.enabled";
  const loadFailure = new RangeError("The backend failed to load.");

  async function readJsonAsync(file: string): Promise<unknown> {
    return JSON.parse(await readFile(new URL(`../../../noldova.computer-use/${file}`, import.meta.url), "utf8"));
  }

  it("registers the tools module.json declares, in its order", async () => {
    const harness = await RuntimeHarness.startAsync();
    const declaration = await readJsonAsync("module.json");
    assert.ok(typeof declaration === "object" && declaration !== null && "contributes" in declaration);
    const contributes = declaration.contributes;
    assert.ok(typeof contributes === "object" && contributes !== null && "tools" in contributes);

    assert.deepEqual(harness.tools.registry.listTools().map(t => t.name), contributes.tools);
  });

  it("refuses arguments its schemas refuse through the registry, before the tool runs or asks", async () => {
    const harness = await RuntimeHarness.startAsync();

    for (const [name, input] of [["computer_list_displays", { all: true }], ["computer_click", { x: -1, y: 0, summary: "Opens it." }], ["computer_type", { text: "a" }]] as const)
      await RuntimeHarness.assertFailsAsync(harness.callAsync(name, input), ToolFailureCode.Refused);
    assert.deepEqual(harness.answerer.delivered(), []);
  });

  for (const [name, input] of [
    ["computer_list_displays", {}],
    ["computer_list_apps", {}],
    ["computer_request_apps", { apps: [RuntimeHarness.notes.identity.id], reason: "To write the note." }],
    ["computer_screenshot", {}],
    ["computer_zoom", { region: [0, 0, 1, 1] }],
    ["computer_read_window", {}],
    ["computer_click", { x: 0, y: 0, summary: "Opens the note." }],
    ["computer_scroll", { x: 0, y: 0, direction: "down", amount: 1, summary: "Shows the rest." }],
    ["computer_move", { x: 0, y: 0 }],
    ["computer_drag", { to: [1, 1], summary: "Moves the card." }],
    ["computer_type", { text: "a", summary: "Types the title." }],
    ["computer_key", { keys: "Enter", summary: "Saves the note." }],
    ["computer_batch", { actions: [{ action: "click", x: 0, y: 0 }], summary: "Opens the note." }]
  ] as const)
    it(`asks for the screen before ${name} runs, which fails as denied when the person refuses and as stopped once control stops`, async () => {
      const harness = await RuntimeHarness.startAsync();

      const denied = harness.callAsync(name, input);
      await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);
      await RuntimeHarness.assertFailsAsync(denied, ToolFailureCode.Denied);
      const waiting = harness.callAsync(name, input);
      const pending = await harness.answerer.nextAsync();
      harness.tools.stopAll("The person stopped every agent.");

      await RuntimeHarness.assertFailsAsync(waiting, ToolFailureCode.Withdrawn);
      assert.equal(pending.signal.aborted, true);
      await RuntimeHarness.assertFailsAsync(harness.callAsync(name, input), ToolFailureCode.Stopped, /until the person resumes it/);
      await harness.tools.idleAsync();
      assert.deepEqual(harness.center.records().map(t => [t.action, t.decision]), [
        ["computer-use.controlScreen", PermissionDecision.Denied],
        ["computer-use.controlScreen", PermissionDecision.Withdrawn]
      ]);
      assert.deepEqual(harness.input.sent, []);
    });

  it("answers computer_list_displays from the backend once the screen is granted", async () => {
    const harness = await RuntimeHarness.startAsync();
    harness.backend.displays.displays = [new Display("display-1", 0, 0, 8, 6, 1, true)];

    const call = harness.callAsync("computer_list_displays", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    assert.deepEqual((await call).structured, { displays: [{ id: "display-1", x: 0, y: 0, width: 8, height: 6, scaleFactor: 1, isPrimary: true }] });
  });

  it("fails as denied, sending nothing, when the person refuses the screen", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_list_displays", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.Deny);

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Denied);
    assert.deepEqual(harness.backend.displays.signals, []);
  });

  it("withdraws its tools when it deactivates, and a second deactivation is harmless", async () => {
    const harness = await RuntimeHarness.startAsync();

    await harness.part.deactivateAsync();
    await harness.part.deactivateAsync();

    assert.deepEqual(harness.tools.registry.listTools(), []);
  });

  it("answers the window's stop, status read and colour as idle once it has deactivated, showing nothing", async () => {
    const harness = await RuntimeHarness.startAsync();

    await harness.part.deactivateAsync();

    assert.deepEqual(await harness.context.callMethodAsync("computer-use.stop", {}), {});
    assert.deepEqual(await harness.context.callMethodAsync("computer-use.statusRead", {}), { state: "Idle", sessionId: null });
    assert.deepEqual(await harness.context.callMethodAsync("computer-use.borderColorSet", { color: "#4DAAFC" }), {});
    assert.equal(harness.tools.registry.isStopped, false);
    assert.deepEqual(harness.backend.border.calls, []);
  });

  it("can activate again after deactivating, with a fresh session grant", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    await harness.part.deactivateAsync();

    await harness.reactivateAsync();
    const call = harness.callAsync("computer_list_displays", {});
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);

    assert.deepEqual((await call).structured, { displays: [] });
  });

  it("registers only the methods, events and tools its module.json contributes, so the base refuses none", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.part.deactivateAsync();

    await assert.rejects(harness.part.activateAsync(new RuntimePartContextDouble(harness.center, undefined, {})), {
      message: "The module doesn't contribute the method computer-use.stop."
    });
    await assert.rejects(harness.part.activateAsync(new RuntimePartContextDouble(harness.center, undefined, { methods: ["computer-use.stop"] })), {
      message: "The module doesn't contribute the method computer-use.statusRead."
    });
    await assert.rejects(harness.part.activateAsync(new RuntimePartContextDouble(harness.center, undefined, { methods: ["computer-use.stop", "computer-use.statusRead"] })), {
      message: "The module doesn't contribute the method computer-use.borderColorSet."
    });
    await assert.rejects(harness.part.activateAsync(new RuntimePartContextDouble(harness.center, undefined, {
      methods: ["computer-use.stop", "computer-use.statusRead", "computer-use.borderColorSet"]
    })), {
      message: "The module doesn't contribute the event computer-use.statusChanged."
    });
    await harness.reactivateAsync();
    assert.equal(harness.tools.registry.listTools().length, 13);
  });

  it("declares its dependencies in module.json as an object from module ID to version range, as the base reads them, and has none", async () => {
    const declaration = await readJsonAsync("module.json");

    assert.ok(typeof declaration === "object" && declaration !== null && "dependencies" in declaration);
    assert.deepEqual(declaration.dependencies, {});
  });

  it("declares its preview setting, off by default, as the switch setting the base turns it on and off with", async () => {
    const declaration = await readJsonAsync("module.json");
    const settings = await readJsonAsync("settings.json");
    assert.ok(typeof declaration === "object" && declaration !== null);
    assert.ok(typeof settings === "object" && settings !== null && "settings" in settings);

    const read = ModuleDeclaration.fromJson({ ...declaration, runtimePackage: "@noldova/computer-use.runtime", settings: settings.settings });

    assert.equal(read.switchSetting, enabledSetting);
    assert.deepEqual(read.contributions.get("settings"), [enabledSetting, "computer-use.showBorder"]);
    assert.deepEqual(read.settings.map(t => [t.name.text, t.type.kind, t.defaultValue]), [[enabledSetting, SettingKind.Boolean, false], ["computer-use.showBorder", SettingKind.Boolean, true]]);
  });

  it("offers its tools for as long as it's active, whatever its preview setting reads, and a new part offers them as the module is switched on again", async () => {
    const harness = await RuntimeHarness.startAsync();
    const answered = harness.callAsync("computer_list_displays", {});
    const pending = await harness.answerer.nextAsync();

    harness.context.settings.write(enabledSetting, false);
    harness.answerer.answer(pending.id, PermissionOption.AllowOnce);

    assert.deepEqual((await answered).structured, { displays: [] });
    assert.equal(harness.tools.registry.listTools().length, 13);
    const waiting = harness.callAsync("computer_request_apps", { apps: [RuntimeHarness.notes.identity.id], reason: "To write the note." });
    await harness.answerer.nextAsync();
    await harness.switchAsync(false);
    await RuntimeHarness.assertFailsAsync(waiting, ToolFailureCode.Withdrawn);
    assert.deepEqual(harness.tools.registry.listTools(), []);
    await harness.switchAsync(true);

    assert.equal(harness.tools.registry.listTools().length, 13);
    assert.deepEqual(harness.context.written, []);
  });

  it("publishes the apps service, which describes an app through the backend while the part is active and gives null once it deactivates", async () => {
    const harness = await RuntimeHarness.startAsync();
    const notes = new AppDescription(RuntimeHarness.notes.identity, "Notes", "Example Ltd", new Uint8Array([137, 80, 78, 71]));
    harness.apps.descriptions = new Map([[notes.identity.id, notes]]);
    const apps = harness.context.services.get("computer-use.apps");
    assert.ok(apps instanceof AppsService);
    const describeAsync = async (): Promise<AppDescription | null> => await apps.describeAsync(notes.identity.id, HangGuard.signal());

    assert.equal(await describeAsync(), notes);
    await harness.part.deactivateAsync();
    assert.equal(await describeAsync(), null);
    assert.deepEqual(harness.apps.described, [{ identity: notes.identity.id, iconSize: 64 }]);
  });

  it("writes the apps service's failure to the module's log, naming the kind of failure and not the app", async () => {
    const harness = await RuntimeHarness.startAsync();
    harness.apps.failure = new BackendFailureException("describeApp");
    const apps = harness.context.services.get("computer-use.apps");
    assert.ok(apps instanceof AppsService);

    assert.equal(await apps.describeAsync(RuntimeHarness.notes.identity.id, HangGuard.signal()), null);
    assert.deepEqual(harness.context.written, ["Describing an app failed with BackendFailureException, so the apps service answered that it has no description."]);
  });

  it("withdraws what it registered when its backend fails to load, failing its activation, and activates afresh the next time", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.part.deactivateAsync();
    const context = new RuntimePartContextDouble(new RecordingPermissionCenter());
    let loads = 0;
    const part = new RuntimePart(() => {
      loads += 1;
      if (loads === 1)
        throw loadFailure;

      return harness.backend;
    });

    await assert.rejects(part.activateAsync(context), t => t === loadFailure);
    assert.deepEqual(context.tools.registry.listTools(), []);
    const next = new RuntimePartContextDouble(new RecordingPermissionCenter());
    await part.activateAsync(next);

    assert.equal(loads, 2);
    assert.equal(next.tools.registry.listTools().length, 13);
    assert.deepEqual([context.written, next.written], [[], []]);
  });

  it("loads its backend over the context of each activation, as the starter of its programs", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.part.deactivateAsync();
    const starters: unknown[] = [];
    const part = new RuntimePart(t => {
      starters.push(t);

      return harness.backend;
    });
    const first = new RuntimePartContextDouble(new RecordingPermissionCenter());
    await part.activateAsync(first);
    await part.deactivateAsync();
    const second = new RuntimePartContextDouble(new RecordingPermissionCenter());
    await part.activateAsync(second);

    assert.equal(starters.length, 2);
    assert.equal(starters[0], first);
    assert.equal(starters[1], second);
  });

  it("loads its backend only when it activates, over the context as the starter of its programs, and offers no tool without one", async () => {
    const context = new RuntimePartContextDouble(new RecordingPermissionCenter());
    const starters: unknown[] = [];
    const part = new RuntimePart(t => {
      starters.push(t);

      throw loadFailure;
    });
    assert.deepEqual(starters, []);

    await assert.rejects(part.activateAsync(context), t => t === loadFailure);

    assert.equal(starters.length, 1);
    assert.equal(starters[0], context);
    assert.deepEqual(context.tools.registry.listTools(), []);
    assert.deepEqual(context.starter.requests, []);
  });

  it("loads the backend of Windows or macOS without reaching the operating system", () => {
    const starter = new ProgramStarterDouble();

    assert.ok(RuntimePart.loadPlatformBackend(starter, "win32") instanceof WindowsBackend);
    assert.ok(RuntimePart.loadPlatformBackend(starter, "darwin") instanceof MacBackend);
    assert.deepEqual(starter.requests, []);
  });

  it("loads the backend of the platform it runs on by default, reaching nothing until a tool's call", async () => {
    const context = new RuntimePartContextDouble(new RecordingPermissionCenter());
    const part = new RuntimePart();

    await part.activateAsync(context);
    assert.equal(context.tools.registry.listTools().length, 13);
    await part.deactivateAsync();

    assert.deepEqual(context.starter.requests, []);
  });

  it("keeps the screen when another session ends", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    harness.endSession("session-2");

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_list_apps", {}, undefined, "conversation-2", "session-2"), ToolFailureCode.Unavailable, /Another conversation/);
  });
});
