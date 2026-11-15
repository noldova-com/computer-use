/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ToolFailureCode } from "@noldova/desktop.runtime";

import { KeyCalls } from "./key-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

describe("the remembered grants", () => {
  it("is denied without asking, raising no system request, once the app's grant is revoked in the app's settings", async () => {
    const harness = await KeyCalls.grantedAsync();
    const asked = harness.answerer.delivered().length;

    for (const answer of harness.center.remembered())
      harness.center.forget(answer);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Meta+R")), ToolFailureCode.Denied, /didn't allow this input/);
    assert.equal(harness.answerer.delivered().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });
});
