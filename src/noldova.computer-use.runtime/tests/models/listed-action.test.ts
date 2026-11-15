/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject, JsonValue } from "@noldova/computer-use.protocol";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";
import { ScreenImages } from "../services/screen-images.fixture.ts";

describe("a listed action", () => {
  const summary = "Fills in the note's title.";

  const click = { action: "click", x: 1, y: 2 };

  function listing(...actions: JsonValue[]): JsonObject {
    return { actions, summary };
  }

  function isList(value: JsonValue): value is readonly JsonValue[] {
    return Array.isArray(value);
  }

  function objectOf(value: JsonValue | undefined): JsonObject {
    assert.ok(typeof value === "object" && value !== null && !isList(value));

    return value;
  }

  async function shotAsync(): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", {});

    return harness;
  }

  it("runs ten actions, and describes each action as its own tool's arguments with action and without summary", async () => {
    const harness = await shotAsync();

    const result = await harness.callAsync("computer_batch", listing(...Array.from({ length: 10 }, () => click)));

    assert.equal(result.structured?.["ran"], 10);
    const schema = objectOf(harness.tools.registry.listTools().find(t => t.name === "computer_batch")?.inputSchema);
    const actions = objectOf(objectOf(schema["properties"])["actions"]);
    const items = objectOf(actions["items"])["anyOf"];
    assert.ok(Array.isArray(items));
    assert.deepEqual(schema["required"], ["actions", "summary"]);
    assert.deepEqual([actions["minItems"], actions["maxItems"]], [1, 10]);
    assert.deepEqual(items.map(t => objectOf(objectOf(t)["properties"])["action"]), ["click", "scroll", "move", "drag", "type", "key"].map(t => ({ const: t })));
    assert.deepEqual(items[2], {
      type: "object",
      properties: { action: { const: "move" }, x: { type: "integer", minimum: 0 }, y: { type: "integer", minimum: 0 }, control: { type: "string", minLength: 1 } },
      required: ["action"],
      additionalProperties: false
    });
    assert.deepEqual(items[4], {
      type: "object",
      properties: { action: { const: "type" }, text: { type: "string", minLength: 1, maxLength: 4000 } },
      required: ["action", "text"],
      additionalProperties: false
    });
  });
});
