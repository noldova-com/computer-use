/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { BackendAnswerInvalidException, BundleIdInvalidException } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

after(() => {
  MacBackendHarness.removeStops();
});

describe("the backends' reading of their answers", () => {
  it("fails as the backend's own failure, naming the answer and its value, when a model refuses a value it answered", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const window = { windowId: "100", processId: 42, bundleId: "com.example.notes", appName: "Notes", x: 10, y: 20, width: 0, height: 600 };
    channel.answers.set("getForegroundWindow", window);
    const reading = backend.windows.getForegroundWindowAsync(HangGuard.signal());

    await assert.rejects(reading, BackendAnswerInvalidException);
    await assert.rejects(reading, {
      message: "The desktop answered getForegroundWindow with a value the module can't use: The rectangle at 10, 20 of 0 by 600 must be whole desktop units, with a size above zero. (Parameter 'width')",
      answer: "getForegroundWindow",
      value: window
    });
    await assert.rejects(reading, (error: unknown) => error instanceof BackendAnswerInvalidException && error.cause instanceof ArgumentOutOfRangeException && error.cause.actualValue === 0);
  });

  it("passes on a failure of the module's own that reading an answer throws, as it is", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("listWindows", { isComplete: true, windows: [{ windowId: "100", bundleId: "com.example notes", x: 0, y: 0, width: 10, height: 10 }] });

    await assert.rejects(backend.windows.listStackAsync(HangGuard.signal()), BundleIdInvalidException);
  });
});
