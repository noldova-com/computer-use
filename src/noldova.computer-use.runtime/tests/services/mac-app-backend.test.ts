/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { MacScriptFailedException } from "@noldova/computer-use.runtime/macos";
import { ProcessStartFailedException } from "@noldova/desktop.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const NOTES = MacBackendHarness.notes;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's apps", () => {
  it("lists the running apps, then the installed ones, once each by bundle identifier, with the app it runs in marked", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("listApps", {
      host: "com.example.Host",
      running: [{ bundleId: "com.example.Notes", name: "Notes" }, { bundleId: "com.example.host", name: "Host" }],
      installed: [{ bundleId: "com.example.notes", name: "Notes again" }, { bundleId: "com.example.maps", name: "Maps" }]
    });

    const apps = await backend.apps.listAppsAsync(HangGuard.signal());

    assert.deepEqual(channel.named("listApps"), [{ hostPath: "/Applications/Host.app" }]);
    assert.deepEqual(apps.map(t => [t.identity.id, t.name, t.publisher, t.isRunning, t.isHost]), [
      ["com.example.notes", "Notes", null, true, false],
      ["com.example.host", "Host", null, true, true],
      ["com.example.maps", "Maps", null, false, false]
    ]);
  });

  it("marks no app as the host outside any app bundle", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("listApps", { host: "", running: [{ bundleId: "com.example.notes", name: "Notes" }], installed: [] });

    assert.deepEqual((await backend.apps.listAppsAsync(HangGuard.signal())).map(t => t.isHost), [false]);
  });

  it("lists nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();

    await assert.rejects(backend.apps.listAppsAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
  });

  it("describes an app by its bundle's name, with the icon the script draws at the size asked and its bundle's signer as publisher", async () => {
    const { channel, signatures, backend } = MacBackendHarness.start();
    channel.answers.set("describeBundle", { name: "Notes", path: "/Applications/Notes.app", icon: Buffer.from([137, 80, 78, 71]).toString("base64") });
    signatures.signers.set("/Applications/Notes.app", "Example Corp");

    const app = await backend.apps.describeAppAsync(NOTES, 64, HangGuard.signal());

    assert.deepEqual(channel.named("describeBundle"), [{ bundleId: "com.example.notes", iconSize: 64 }]);
    assert.deepEqual(signatures.read, ["/Applications/Notes.app"]);
    assert.deepEqual([app?.identity, app?.name, app?.publisher, [...app?.icon ?? []]], [NOTES, "Notes", "Example Corp", [137, 80, 78, 71]]);
  });

  it("describes an app without an icon when the script draws none, and without a publisher when its bundle has no signer", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("describeBundle", { name: "Notes", path: "/Applications/Notes.app", icon: null });

    const app = await backend.apps.describeAppAsync(NOTES, 64, HangGuard.signal());

    assert.deepEqual([app?.icon, app?.publisher], [null, null]);
  });

  it("describes an app without a publisher when its signature can't be read", async () => {
    const { channel, signatures, backend } = MacBackendHarness.start();
    channel.answers.set("describeBundle", { name: "Notes", path: "/Applications/Notes.app", icon: null });
    signatures.failure = new ProcessStartFailedException("codesign");

    const app = await backend.apps.describeAppAsync(NOTES, 64, HangGuard.signal());

    assert.deepEqual([app?.name, app?.publisher], ["Notes", null]);
  });

  it("fails a description with any other failure of the signature's read", async () => {
    const { channel, signatures, backend } = MacBackendHarness.start();
    channel.answers.set("describeBundle", { name: "Notes", path: "/Applications/Notes.app", icon: null });
    const failure = new Error("codesign's output broke");
    signatures.failure = failure;

    await assert.rejects(backend.apps.describeAppAsync(NOTES, 64, HangGuard.signal()), (error: unknown) => error === failure);
  });

  it("rejects with the caller's reason when the caller ends the call during the signature's read", async () => {
    const { channel, signatures, backend } = MacBackendHarness.start();
    const controller = new AbortController();
    const reason = new Error("the caller left");
    channel.answers.set("describeBundle", { name: "Notes", path: "/Applications/Notes.app", icon: null });
    signatures.during = () => controller.abort(reason);
    signatures.failure = new Error("codesign was stopped");

    await assert.rejects(backend.apps.describeAppAsync(NOTES, 64, controller.signal), reason);
  });

  it("asks no signer for an app the script doesn't describe", async () => {
    const { signatures, backend } = MacBackendHarness.start();

    assert.equal(await backend.apps.describeAppAsync(NOTES, 64, HangGuard.signal()), null);
    assert.deepEqual(signatures.read, []);
  });

  it("fails a description with the script's failure, such as an icon it couldn't draw, asking no signer", async () => {
    const { channel, signatures, backend } = MacBackendHarness.start();
    channel.failures.add("describeBundle");

    await assert.rejects(backend.apps.describeAppAsync(NOTES, 64, HangGuard.signal()),
      (error: unknown) => error instanceof MacScriptFailedException && error.method === "describeBundle" && error.scriptMessage === "describeBundle failed");
    assert.deepEqual(signatures.read, []);
  });

  it("describes nothing once the call has ended, before or during the script's answer", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const controller = new AbortController();
    channel.answers.setBy("describeBundle", () => {
      controller.abort();

      return { name: "Notes", path: "/Applications/Notes.app", icon: null };
    });

    await assert.rejects(backend.apps.describeAppAsync(NOTES, 64, AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
    await assert.rejects(backend.apps.describeAppAsync(NOTES, 64, controller.signal), { name: "AbortError" });
  });
});
