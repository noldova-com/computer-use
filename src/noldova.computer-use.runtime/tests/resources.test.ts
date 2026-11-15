/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  Display,
  DisplayIdEmptyException,
  DisplayOriginInvalidException,
  DisplayScaleInvalidException,
  DisplaySizeInvalidException,
  RefusalReason
} from "@noldova/computer-use.runtime";
import { WindowsBackend } from "@noldova/computer-use.runtime/windows";
import { ToolFailureException } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "./services/runtime-harness.fixture.ts";

describe("Resources", () => {
  it("describes the list-displays tool to the model", async () => {
    const harness = await RuntimeHarness.startAsync();
    const listed = harness.tools.registry.listTools().find(t => t.name === "computer_list_displays");

    assert.equal(listed?.description, "Lists the displays: each one's ID, position and size in pixels, scale factor, and whether it is the primary display.");
    assert.deepEqual(listed?.inputSchema, { type: "object", properties: {}, additionalProperties: false });
  });

  it("names the display whose values are refused", () => {
    assert.throws(() => new Display("", 0, 0, 1, 1, 1, true), DisplayIdEmptyException);
    assert.throws(() => new Display("", 0, 0, 1, 1, 1, true), { message: "A display ID must not be empty." });
    assert.throws(() => new Display("d", 0.5, 0, 1, 1, 1, true), DisplayOriginInvalidException);
    assert.throws(() => new Display("d", 0.5, 0, 1, 1, 1, true), { message: "Display d's position must be whole pixels." });
    assert.throws(() => new Display("d", 0, 0, 0, 1, 1, true), DisplaySizeInvalidException);
    assert.throws(() => new Display("d", 0, 0, 0, 1, 1, true), { message: "Display d's size must be whole pixels above zero." });
    assert.throws(() => new Display("d", 0, 0, 1, 1, 0, true), DisplayScaleInvalidException);
    assert.throws(() => new Display("d", 0, 0, 1, 1, 0, true), { message: "Display d's scale factor must be a finite number above zero." });
  });

  it("names the addon's build after this process's platform and architecture", () => {
    assert.equal(path.basename(path.dirname(WindowsBackend.addonFile)), `${process.platform}-${process.arch}`);
  });

  it("codes a refusal as the module's ID and the reason's name, from a lowercase letter", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);
    harness.input.refusalBeforeSending = RefusalReason.PasswordField;

    await assert.rejects(harness.callDirectlyAsync("computer_type", { text: "a", summary: "Types a letter." }),
      t => t instanceof ToolFailureException && t.failure.moduleCode === "computer-use.passwordField");
  });
});
