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

describe("the tier policy", () => {
  it("grants the app it runs in at no tier, whatever its category, and any other app at its category's tier", async () => {
    const harness = await RuntimeHarness.startAsync();
    const terminal = new AppIdentity("C:\\Windows\\System32\\cmd.exe");
    const host = new AppInfo(terminal, "Command Prompt", null, true, true);
    const other = new AppInfo(terminal, "Command Prompt", null, true, false);
    harness.apps.apps = [host, other];

    const call = harness.callAsync("computer_list_apps", {});
    await harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce);

    assert.deepEqual((await call).structured, {
      apps: [
        { identity: terminal.id, name: "Command Prompt", publisher: null, isRunning: true, tier: null, isGranted: false },
        { identity: terminal.id, name: "Command Prompt", publisher: null, isRunning: true, tier: "ClickOnly", isGranted: false }
      ]
    });
  });
});
