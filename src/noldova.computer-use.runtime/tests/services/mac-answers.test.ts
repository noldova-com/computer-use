/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { KeyName } from "@noldova/computer-use.runtime";
import { MacAnswerUnreadableException } from "@noldova/computer-use.runtime/macos";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const TARGET = MacBackendHarness.target;
const DISPLAY = MacBackendHarness.display;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS input process's answers", () => {
  for (const answer of [null, {}, [{ ...DISPLAY, id: 1 }], [{ ...DISPLAY, isPrimary: "yes" }], [[]]])
    it(`fails on an answer it can't read, ${JSON.stringify(answer)}, naming the method`, async () => {
      const { channel, backend } = MacBackendHarness.start();
      channel.answers.set("listDisplays", answer);

      await assert.rejects(backend.displays.listDisplaysAsync(HangGuard.signal()), MacAnswerUnreadableException);
      await assert.rejects(backend.displays.listDisplaysAsync(HangGuard.signal()), {
        message: "The macOS input process answered listDisplays with a value the module can't read.",
        method: "listDisplays"
      });
    });

  for (const outcome of [{ status: "sent" }, { status: "refused", reason: 5 }, { status: "done", inputSent: "yes" }, "done"])
    it(`reads no input's outcome ${JSON.stringify(outcome)}, whose status it doesn't know or whose facts aren't of their kinds`, async () => {
      const { channel, backend } = MacBackendHarness.start();
      channel.outcome = outcome;

      await assert.rejects(backend.input.pressKeyAsync(TARGET, KeyName.A, [], HangGuard.signal()), MacAnswerUnreadableException);
      await assert.rejects(backend.input.pressKeyAsync(TARGET, KeyName.A, [], HangGuard.signal()), { method: "pressKey" });
    });
});
