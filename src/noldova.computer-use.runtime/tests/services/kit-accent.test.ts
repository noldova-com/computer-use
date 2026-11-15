/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { Display } from "@noldova/computer-use.runtime";
import { PermissionOption } from "@noldova/desktop.runtime";

import { BorderCalls } from "./border-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

const PRIMARY = new Display("1", 0, 0, 1920, 1080, 1, true);

async function startAsync(t: TestContext, kitAccentFile: string): Promise<RuntimeHarness> {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const harness = await RuntimeHarness.startAsync(undefined, undefined, null, undefined, kitAccentFile);
  harness.backend.displays.displays = [PRIMARY];
  harness.backend.border.units = 1;

  return harness;
}

async function controlAsync(t: TestContext, harness: RuntimeHarness): Promise<void> {
  const shown = new BorderCalls(t, harness.backend.border).nextAsync();
  const call = harness.callAsync("computer_list_displays", {});
  await Promise.race([call, harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce)]);
  await call;
  await shown;
}

describe("the kit's accent", () => {
  const unreadable: readonly (readonly [string, string | null, string])[] = [
    ["a missing file", null, "Error: ENOENT"],
    ["a file that isn't JSON", "{", "SyntaxError"],
    ["a file with no colour", "{}", "JsonException"],
    ["a file that isn't an object", "[]", "JsonException"],
    ["a file whose colour isn't text", "{\"color\":5}", "JsonException"],
    ["a file whose colour isn't #RRGGBB", "{\"color\":\"blue\"}", "BorderColorInvalidException"]
  ];

  for (const [name, content, failure] of unreadable) {
    it(`shows in the fallback colour, and says why in the log, when the kit's accent is ${name}`, async t => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), "noldova-kit-accent-"));
      t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
      const file = path.join(folder, "kit-accent.json");
      if (content !== null)
        fs.writeFileSync(file, content);
      const harness = await startAsync(t, file);

      await controlAsync(t, harness);

      assert.deepEqual(harness.backend.border.calls.map(t => t?.color ?? null), ["#005FB8"]);
      assert.equal(harness.context.written.length, 1);
      assert.match(harness.context.written[0] ?? "", new RegExp(`^Computer use couldn't read the kit's accent, so its border has #005FB8 until the app sends its colour: ${failure}`, "u"));
    });
  }

  it("fails to turn on with any other failure to read the kit's accent", async () => {
    await assert.rejects(RuntimeHarness.startAsync(undefined, undefined, null, undefined, "kit\0accent.json"), { code: "ERR_INVALID_ARG_VALUE" });
  });
});
