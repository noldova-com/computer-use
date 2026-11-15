/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@angular/compiler";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState, StopRequest } from "@noldova/computer-use.protocol";

import { WindowPartHarness } from "../fixtures/window-part-harness.fixture.ts";

describe("StopControl", () => {
  it("sends the stop request to the runtime part", async () => {
    const harness = new WindowPartHarness();
    await harness.activateAsync(ControlState.Controlling);

    await harness.command.runAsync(null);

    assert.deepEqual(harness.requests.at(-1), [StopRequest.method, {}]);
  });
});
