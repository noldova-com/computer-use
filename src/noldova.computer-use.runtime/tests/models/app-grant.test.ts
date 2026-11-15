/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RuntimeHarness } from "../services/runtime-harness.fixture.ts";

describe("an app's grant", () => {
  it("marks the apps granted to this conversation only", async () => {
    const harness = await RuntimeHarness.startAsync();
    await harness.grantAppAsync(RuntimeHarness.notes);

    assert.deepEqual((await harness.callAsync("computer_list_apps", {})).structured, RuntimeHarness.listingOf([RuntimeHarness.notes]));
  });
});
