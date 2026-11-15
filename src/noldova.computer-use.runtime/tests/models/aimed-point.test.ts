/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopPoint } from "@noldova/computer-use.runtime";

import { ClickCalls } from "../services/click-calls.fixture.ts";

describe("an aimed point", () => {
  it("names the point in the request by the screenshot's pixel the agent gave, and sends the desktop point under it", async () => {
    const harness = await ClickCalls.shotAsync(0.5);

    await harness.callAsync("computer_click", ClickCalls.clicking(1, 2));

    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(3, 5)]]);
    assert.deepEqual(harness.center.records().at(-1)?.details.filter(t => t.name === "point"), [{ name: "point", value: "1, 2" }]);
  });
});
