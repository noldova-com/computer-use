/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonReader } from "@noldova/context.json";

import { AgentDouble } from "../fixtures/agent-double.ts";
import { expect, test } from "../fixtures/app-test.ts";
import { HangLimits } from "../fixtures/hang-limits.ts";
import type { TestApp } from "../fixtures/test-app.ts";
import { StopKey } from "../fixtures/stop-key.ts";
import { TestWindows } from "../fixtures/test-windows.ts";

const STATUS_ITEM: string = "computer-use.status";
const STATUS_TEXT: string = "Controlling the screen";
const SCREEN_ORIGIN: string = "computer-use:screen";
const STOPPED: string = "Stopped";
const SAVE_CONTROL: RegExp = /^\s*- button "Save".*\[(c\d+)\]$/m;

test.use({ isComputerUseOn: true });

const expectSucceeded = (result: JsonReader): void => {
  expect(result.readBoolean("isFailure"), AgentDouble.describe(result)).toBe(false);
};

const expectStoppedAsync = async (app: TestApp, agent: AgentDouble): Promise<void> => {
  await expect(app.statusItem(STATUS_ITEM)).toBeHidden();
  const stopped = await agent.callAsync("computer_screenshot");
  expect([stopped.readBoolean("isFailure"), stopped.readOptionalString("code")], AgentDouble.describe(stopped)).toEqual([true, STOPPED]);
};

const resumeAsync = async (app: TestApp, agent: AgentDouble): Promise<void> => {
  await app.runCommandAsync("Resume agents", "desktop.resumeAgentControl");
  let screenshot = await agent.callAsync("computer_screenshot");
  await expect.poll(async () => {
    if (screenshot.readOptionalString("code") === STOPPED)
      screenshot = await agent.callAsync("computer_screenshot");
    return screenshot.readOptionalString("code");
  }, { message: "Agent control stayed stopped after the resume command." }).not.toBe(STOPPED);
  expectSucceeded(screenshot);
  await expect(app.statusItem(STATUS_ITEM)).toContainText(STATUS_TEXT);
};

test.describe("computer use in a real app, with the operating system's grants", () => {
  test.skip(process.platform !== "win32" && process.platform !== "darwin", "Computer use has backends on Windows and macOS only.");

  test("asks for the screen and the test window's app, sees and clicks the window, shows its status, and stops on the stop key and on its status bar item", async ({ app }) => {
    await app.openModulesAsync();
    await expect(app.moduleRow("computer-use").locator(".nol-modules-state-label")).toHaveText("Active");
    await expect(app.statusItem(STATUS_ITEM)).toBeHidden();
    const window = await TestWindows.openAsync(HangLimits.DESKTOP_TEST_COVERS_A_COLD_APP_START_THE_TEST_WINDOW_AND_EVERY_TOOL_CALL_MS);
    const agent = new AgentDouble(app);
    try {
      await agent.planAsync(AgentDouble.CONTROL_SCREEN, AgentDouble.ALLOW_ONCE);
      const listed = await agent.callAsync("computer_list_apps");
      expectSucceeded(listed);
      expect((await agent.takeQuestionsAsync()).map(t => [t.readString("action"), t.readString("decision")])).toEqual([[AgentDouble.CONTROL_SCREEN, "AllowedOnce"]]);
      await expect(app.statusItem(STATUS_ITEM)).toContainText(STATUS_TEXT);

      const testWindowApp = listed.readObject("structured").readObjectArray("apps").find(t => t.readBoolean("isRunning") && window.isTestWindowApp(t.readString("identity")));
      expect(testWindowApp, "computer_list_apps lists no running app of the test window.").toBeDefined();
      const identity = testWindowApp?.readString("identity") ?? "";
      await agent.planAsync(AgentDouble.CONTROL_APP, AgentDouble.ALLOW_ALWAYS);
      const requested = await agent.callAsync("computer_request_apps", { apps: [identity], reason: "The end-to-end test clicks its own test window." });
      expectSucceeded(requested);
      expect(requested.readObject("structured").readObjectArray("apps").map(t => [t.readString("identity"), t.readBoolean("isGranted")])).toEqual([[identity, true]]);
      expect((await agent.takeQuestionsAsync()).map(t => [t.readString("action"), t.readNullableString("subject")])).toEqual([[AgentDouble.CONTROL_APP, identity]]);

      const screenshot = await agent.callAsync("computer_screenshot");
      expectSucceeded(screenshot);
      expect(AgentDouble.imagesOf(screenshot, SCREEN_ORIGIN).map(t => [t.readString("mimeType"), t.readString("data").length > 0])).toEqual([["image/png", true]]);

      await window.bringToFrontAsync();
      const read = await agent.callAsync("computer_read_window");
      if (process.platform === "win32") {
        const { readFileSync, existsSync } = await import("node:fs");
        const { tmpdir } = await import("node:os");
        const { join } = await import("node:path");
        const file = join(tmpdir(), "noldova-read-diag.log");
        const text = existsSync(file) ? readFileSync(file, "utf8") : `no ${file}`;
        console.log(`READ-DIAG #71 ${AgentDouble.describe(read).slice(0, 400)}
${text}`);
        await test.info().attach("read-diag", { body: text, contentType: "text/plain" });
      }
      expectSucceeded(read);
      const control = AgentDouble.textsOf(read).map(t => SAVE_CONTROL.exec(t)?.[1]).find(t => t !== undefined);
      expect(control, `computer_read_window lists no Save button: ${AgentDouble.describe(read)}`).toBeDefined();
      await agent.planAsync(AgentDouble.CONTROL_APP, AgentDouble.ALLOW_ONCE);
      expectSucceeded(await agent.callAsync("computer_click", { control: control ?? "", summary: "Press the test window's Save button." }));
      await window.waitForSaveAsync();
      expect((await agent.takeQuestionsAsync()).filter(t => t.readString("action") !== AgentDouble.CONTROL_APP || t.readNullableString("subject") !== identity)).toEqual([]);

      await StopKey.pressAsync();
      await expectStoppedAsync(app, agent);
      await resumeAsync(app, agent);

      await app.statusItem(STATUS_ITEM).getByRole("button").click();
      await expectStoppedAsync(app, agent);
      await resumeAsync(app, agent);

      await agent.endAsync();
      await expect(app.statusItem(STATUS_ITEM)).toBeHidden();
    }
    finally {
      try {
        await agent.endAsync();
      }
      finally {
        await window.closeAsync();
      }
    }
  });
});
