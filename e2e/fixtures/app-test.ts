/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";

import { expect, test as base } from "@playwright/test";

import { TestApp } from "./test-app.ts";

export { expect } from "@playwright/test";

export const test = base.extend<{ isComputerUseOn: boolean; dataFiles: Readonly<Record<string, string>>; waitsForStart: boolean; app: TestApp }>({
  isComputerUseOn: [false, { option: true }],
  dataFiles: [{}, { option: true }],
  waitsForStart: [true, { option: true }],
  app: async ({ isComputerUseOn, dataFiles, waitsForStart }, use, testInfo) => {
    const app = await TestApp.launchAsync(testInfo, dataFiles);
    try {
      if (waitsForStart)
        await app.waitForStartAsync();
      if (isComputerUseOn)
        await app.setSettingAsync("computer-use.enabled", true);
      await use(app);
    }
    finally {
      await app.quitAsync();
      expect(existsSync(app.root), `The test app's folder ${app.root} is still there after it quit.`).toBe(false);
    }
  }
});
