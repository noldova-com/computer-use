/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, AppInfo } from "@noldova/computer-use.runtime";
import { PermissionOption } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("the app classifier", () => {
  it("knows a Windows program by its file name in any case and a macOS app by its bundle identifier, and any other app as an ordinary one", async () => {
    const harness = await RuntimeHarness.startAsync();
    const tiers: readonly (readonly [AppInfo, string | null])[] = [
      [new AppInfo(new AppIdentity("D:\\Tools\\CHROME.EXE"), "Chrome", null, true, false), "ViewOnly"],
      [new AppInfo(new AppIdentity("C:\\Jts\\TWS.EXE"), "Trader Workstation", null, true, false), "ViewOnly"],
      [new AppInfo(new AppIdentity("C:\\Program Files\\Microsoft VS Code\\Code.exe"), "Code", null, true, false), "ClickOnly"],
      [new AppInfo(AppIdentity.ofMacBundleId("com.install4j.5889-6375-8446-2021"), "Trader Workstation", null, true, false), "ViewOnly"],
      [new AppInfo(AppIdentity.ofMacBundleId("com.install4j.9968-4488-2169-7623.18"), "thinkorswim", null, true, false), "ViewOnly"],
      [new AppInfo(AppIdentity.ofMacBundleId("net.metaquotes.wine.MetaTrader5"), "MetaTrader 5", null, true, false), "ViewOnly"],
      [new AppInfo(AppIdentity.ofMacBundleId("com.jetbrains.rider"), "Rider", null, true, false), "ClickOnly"],
      [new AppInfo(AppIdentity.ofMacBundleId("com.apple.Terminal"), "Terminal", null, true, false), "ClickOnly"],
      [new AppInfo(AppIdentity.ofMacBundleId("com.apple.keychainaccess"), "Keychain Access", null, false, false), null],
      [new AppInfo(new AppIdentity("C:\\Windows\\System32\\SystemSettings.exe"), "Settings", null, false, false), null],
      [new AppInfo(new AppIdentity("C:\\Tools\\chrome.exe.old"), "Old", null, false, false), "Full"]
    ];
    harness.apps.apps = tiers.map(t => t[0]);

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce);

    assert.deepEqual((await call).structured, {
      apps: tiers.map(([app, tier]) => ({ identity: app.identity.id, name: app.name, publisher: app.publisher, isRunning: app.isRunning, tier, isGranted: false }))
    });
  });
});
