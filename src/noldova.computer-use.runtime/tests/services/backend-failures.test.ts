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

import { ClickCalls } from "./click-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

describe("the backend's own failures", () => {
  it("passes on a failure that isn't the backend's own as it is, measuring, listing the windows or sending", async () => {
    const defect = new TypeError("A defect in the module.");
    const fail = async (): Promise<never> => {
      throw defect;
    };
    const measuring = await ClickCalls.shotAsync();
    measuring.backend.capture.measureDisplayAsync = fail;
    const listing = await ClickCalls.shotAsync();
    listing.windows.listStackAsync = fail;
    const sending = await ClickCalls.shotAsync();
    sending.input.clickAsync = fail;

    for (const harness of [measuring, listing, sending])
      await assert.rejects(harness.callDirectlyAsync("computer_click", ClickCalls.clicking(0, 0)), (error: unknown) => error === defect);
    assert.deepEqual([measuring.input.sent, listing.input.sent], [[], []]);
  });

  it("takes an error the Windows addon throws, which carries its code, as the backend's own failure", async () => {
    const harness = await ClickCalls.shotAsync();
    harness.windows.listStackAsync = async () => {
      throw WindowsBackendHarness.addonFailure("Windows couldn't list the windows.");
    };

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", ClickCalls.clicking(0, 0)), ToolFailureCode.Unavailable, /^The windows under the call's points could not be read\. Nothing was sent\.$/);
    assert.deepEqual(harness.input.sent, []);
  });
});
