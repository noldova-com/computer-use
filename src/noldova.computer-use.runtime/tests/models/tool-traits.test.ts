/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ToolRisk } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("the tools' traits", () => {
  it("registers each tool in the base's registry with its risk range, point of no return and deadline", async () => {
    const harness = await RuntimeHarness.startAsync();
    const reads = { risk: { default: ToolRisk.Low, maximum: ToolRisk.High }, isReadOnly: true, marksSending: false, nextTool: null };
    const inputs = { risk: { default: ToolRisk.Medium, maximum: ToolRisk.High }, isReadOnly: false, marksSending: true, nextTool: "computer_screenshot" };

    assert.deepEqual(harness.tools.registry.listTools().map(t => ({
      name: t.name,
      risk: t.risk,
      isReadOnly: t.isReadOnly,
      marksSending: t.marksSending,
      nextTool: t.nextTool,
      deadline: t.deadline.default
    })), [
      { name: "computer_list_displays", ...reads, deadline: 30_000 },
      { name: "computer_list_apps", ...reads, deadline: 30_000 },
      { name: "computer_request_apps", risk: { default: ToolRisk.Medium, maximum: ToolRisk.High }, isReadOnly: false, marksSending: false, nextTool: null, deadline: 60_000 },
      { name: "computer_screenshot", ...reads, deadline: 30_000 },
      { name: "computer_zoom", ...reads, deadline: 30_000 },
      { name: "computer_read_window", ...reads, deadline: 30_000 },
      { name: "computer_click", ...inputs, deadline: 30_000 },
      { name: "computer_scroll", ...inputs, deadline: 30_000 },
      { name: "computer_move", ...inputs, deadline: 30_000 },
      { name: "computer_drag", ...inputs, deadline: 30_000 },
      { name: "computer_type", ...inputs, deadline: 60_000 },
      { name: "computer_key", ...inputs, deadline: 30_000 },
      { name: "computer_batch", ...inputs, deadline: 60_000 }
    ]);
    assert.ok(harness.tools.registry.listTools().every(t => t.deadline.maximum === 120_000 && t.resource === null));
    assert.equal(harness.tools.registry.listTools().find(t => t.name === "computer_request_apps")?.isResumable, true);
    assert.deepEqual(harness.tools.messages, []);
  });
});
