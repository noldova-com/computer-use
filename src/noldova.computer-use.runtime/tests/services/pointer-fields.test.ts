/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { ToolFailureCode } from "@noldova/desktop.runtime";

import { ClickCalls } from "./click-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

const summary = ClickCalls.summary;

describe("a pointer tool's fields", () => {
  const refused: readonly JsonObject[] = [{}, { x: 0, y: 0 }, { x: 0.5, y: 0, summary }, { x: "0", y: 0, summary }, { x: 0, y: 0, summary: "" },
    { x: 0, y: 0, button: "back", summary }, { x: 0, y: 0, button: 1, summary }, { x: 0, y: 0, modifiers: 1, summary }, { x: 0, y: 0, count: 4, summary }, { x: 0, y: 0, count: 1.5, summary },
    { x: 0, y: 0, modifiers: "Shift+Shift", summary }, { x: 0, y: 0, modifiers: "Hyper", summary }, { x: 0, y: 0, modifiers: "", summary },
    { x: 0, y: 0, summary, display: "display-1" }];
  for (const input of refused)
    it(`refuses the input ${JSON.stringify(input)} before raising anything`, async () => {
      const harness = await ClickCalls.shotAsync();
      const asked = harness.center.records().length;

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", input), ToolFailureCode.Refused, /^computer_click takes x and y/);
      assert.equal(harness.center.records().length, asked);
    });
});
