/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { MacAnswerUnreadableException, type MacBackend } from "@noldova/computer-use.runtime/macos";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const TARGET = MacBackendHarness.target;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS input process's methods", () => {
  const reads: readonly (readonly [string, (backend: MacBackend, signal: AbortSignal) => Promise<unknown>])[] = [
    ["getForegroundWindow", async (backend, signal) => await backend.windows.getForegroundWindowAsync(signal)],
    ["listWindows", async (backend, signal) => await backend.windows.listStackAsync(signal)],
    ["listApps", async (backend, signal) => await backend.apps.listAppsAsync(signal)],
    ["readPointer", async (backend, signal) => await backend.input.readPointerAsync(signal)],
    ["findControl", async (backend, signal) => await backend.controls.findControlAsync(TARGET, "3.1", signal)]
  ];
  for (const [method, readAsync] of reads)
    it(`fails ${method} on an answer it can't read, naming the method`, async () => {
      const { channel, backend } = MacBackendHarness.start();
      channel.answers.set(method, 5);

      await assert.rejects(readAsync(backend, HangGuard.signal()), MacAnswerUnreadableException);
      await assert.rejects(readAsync(backend, HangGuard.signal()), { message: `The macOS input process answered ${method} with a value the module can't read.`, method });
      assert.deepEqual(channel.calls.map(t => t.method), [method, method]);
    });
});
