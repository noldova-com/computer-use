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
import { PermissionOption } from "@noldova/desktop.runtime";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("an app request's outcome", () => {
  const reason = "To write the note.";

  function request(...apps: string[]): JsonObject {
    return { apps, reason };
  }

  it("says for each app how its request ended, and asks nothing for an app it can't find or can never grant", async () => {
    const harness = await RuntimeHarness.startAsync();
    const missing = "C:\\Program Files\\Missing\\missing.exe";

    const call = harness.callAsync("computer_request_apps", request(RuntimeHarness.terminal.identity.id, missing, RuntimeHarness.prompt.identity.id, RuntimeHarness.host.identity.id));
    await harness.answerAsync("computer-use.controlScreen", PermissionOption.AllowOnce);
    await harness.answerAsync("computer-use.controlApp", PermissionOption.Deny);

    assert.deepEqual((await call).structured, {
      apps: [
        { identity: RuntimeHarness.terminal.identity.id, outcome: "Denied", isGranted: false, tier: null },
        { identity: missing, outcome: "NotFound", isGranted: false, tier: null },
        { identity: RuntimeHarness.prompt.identity.id, outcome: "NeverGrantable", isGranted: false, tier: null },
        { identity: RuntimeHarness.host.identity.id, outcome: "NeverGrantable", isGranted: false, tier: null }
      ]
    });
    assert.equal(harness.answerer.delivered().length, 2);
  });
});
