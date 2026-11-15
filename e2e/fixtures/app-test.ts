/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { test as base } from "@playwright/test";

import { TestApp } from "./test-app.ts";

export { expect } from "@playwright/test";

export const test = base.extend<{ isComputerUseOn: boolean; app: TestApp }>({
  isComputerUseOn: [false, { option: true }],
  app: async ({ isComputerUseOn }, use, testInfo) => {
    const app = await TestApp.startAsync(testInfo);
    try {
      if (isComputerUseOn)
        await app.setSettingAsync("computer-use.enabled", true);
      await use(app);
    }
    finally {
      await app.quitAsync();
    }
  }
});
