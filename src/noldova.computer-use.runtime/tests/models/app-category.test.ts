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
import { PermissionOption, ToolRisk } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("an app's category", () => {
  const reason = "To write the note.";

  function request(...apps: string[]): JsonObject {
    return { apps, reason };
  }

  it("asks at the high risk level, with a warning, for an app of broad reach", async () => {
    const harness = await RuntimeHarness.startAsync();

    const call = harness.callAsync("computer_request_apps", request(RuntimeHarness.files.identity.id));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    const pending = await harness.answerAsync("computer-use.controlApp", PermissionOption.AllowAlways);

    assert.equal(pending.request.risk, ToolRisk.High);
    assert.deepEqual(pending.request.details.map(t => [t.label, t.value]).slice(2), [
      ["publisher", "none"],
      ["tier", "Full"],
      ["reason", reason],
      ["warning", "This app can reach files and other apps beyond its own windows."]
    ]);
    await call;
  });
});
