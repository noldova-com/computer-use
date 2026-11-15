/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AgentDouble } from "../fixtures/agent-double.ts";
import { expect, test } from "../fixtures/app-test.ts";

test.describe("computer use installed from its package into an app on Linux", () => {
  test.skip(process.platform !== "linux", "Computer use runs on Windows and macOS, so only Linux shows it as unavailable.");

  test("shows as unavailable with its cause, offers no switch, its setting or its tools, and leaves no module failed", async ({ app }) => {
    await app.openModulesAsync();
    await expect(app.moduleRow("agent-double").locator(".nol-modules-state-label")).toHaveText("Active");
    const row = app.moduleRow("computer-use");
    await expect(row.locator(".nol-modules-state-label")).toHaveText("Unavailable");
    await expect(row.locator(".nol-modules-row-version")).toHaveText("0.0.2");

    await row.click();

    await expect(app.window.locator(".nol-modules-detail-title")).toHaveText("Computer use");
    await expect(app.moduleFact("state")).toHaveText(/Unavailable\s*It doesn't run on Linux\./);
    await expect(app.window.locator(".nol-modules-facts dt", { hasText: "Switch" })).toHaveCount(0);
    await expect(app.window.locator("nol-module-actions")).toHaveCount(0);
    await expect(app.failedModules).toHaveCount(0);
    await expect(app.statusItem("computer-use.status")).toHaveCount(0);
    await expect(app.setSettingAsync("computer-use.enabled", true)).rejects.toThrow(/^desktop\.setSetting failed: /);
    const agent = new AgentDouble(app);
    expect((await agent.listToolsAsync()).filter(t => t.startsWith("computer_"))).toEqual([]);
    await agent.endAsync();
  });
});
