/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, test } from "../fixtures/app-test.ts";

test.describe("a command run while the app's window is still starting", () => {
  test.use({ dataFiles: { "conversations.json": "[]" }, waitsForStart: false });

  test("waits for the start to end and then finds the command", async ({ app }) => {
    await expect(app.window.getByRole("heading", { name: /^Data from an earlier / })).toBeVisible();

    const opening = app.openModulesAsync();
    await app.window.getByRole("button", { name: "Move aside" }).click();
    await opening;

    await expect(app.moduleRow("agent-double")).toBeVisible();
  });
});
