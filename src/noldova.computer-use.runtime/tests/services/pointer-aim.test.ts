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
import { ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

describe("the pointer's aim", () => {
  const summary = "Moves the card to the next column.";

  async function shotAsync(scale: number = 1): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", { scale });

    return harness;
  }

  it("drags from the desktop point where the pointer is when from is left out, raising a request with its pixel", async () => {
    const harness = await shotAsync(0.5);
    harness.input.pointer = new DesktopPoint(5, 3);

    const result = await harness.callAsync("computer_drag", { to: [3, 2], summary });

    assert.deepEqual(result.structured, { dragged: [[2, 1], [3, 2]] });
    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(5, 3), new DesktopPoint(7, 5)]]);
    assert.deepEqual(harness.center.records().at(-1)?.details.slice(1, 3), [{ name: "from", value: "2, 1" }, { name: "to", value: "3, 2" }]);
  });

  it("reads the pointer once, before the request, and drags from there though the pointer moves while the person answers", async () => {
    const harness = await shotAsync();
    let reads = 0;
    harness.input.readPointerAsync = async () => new DesktopPoint(++reads, 1);

    await harness.callAsync("computer_drag", { to: [3, 2], summary });

    assert.equal(reads, 1);
    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(1, 1), new DesktopPoint(3, 2)]]);
  });

  it("refuses a drag from a pointer outside the latest screenshot before raising anything", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;

    for (const pointer of [new DesktopPoint(-1, 0), new DesktopPoint(8, 0), new DesktopPoint(0, 6)]) {
      harness.input.pointer = pointer;
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_drag", { to: [1, 1], summary }), ToolFailureCode.Refused, /^The pointer is outside the latest full screenshot\..* Nothing was sent\.$/);
    }
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails as unavailable, keeping the backend's failure as its cause, when the pointer can't be read, and by the call's end when it ends during the read", async () => {
    const harness = await shotAsync();
    const asked = harness.center.records().length;
    const failure = new BackendFailureException("The pointer can't be read.");
    harness.input.readPointerAsync = async () => {
      throw failure;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_drag", { to: [1, 1], summary }), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.failure.message === "Where the pointer is could not be read. Nothing was sent." && error.cause === failure);

    const controller = new AbortController();
    harness.input.readPointerAsync = async () => {
      controller.abort(ToolAbortReason.Cancelled);
      throw new Error("The read stopped.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_drag", { to: [1, 1], summary }, controller.signal), ToolFailureCode.Cancelled);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("passes on a failure to read the pointer that isn't the backend's own as it is, sending nothing", async () => {
    const harness = await shotAsync();
    const defect = new TypeError("A defect in the module.");
    harness.input.readPointerAsync = async () => {
      throw defect;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_drag", { to: [1, 1], summary }), (error: unknown) => error === defect);
    assert.deepEqual(harness.input.sent, []);
  });
});
