/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity } from "@noldova/computer-use.runtime";

import { HangGuard } from "./hang-guard.fixture.ts";
import { PngImage } from "./png-image.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

describe("the PNG encoder", () => {
  it("describes a program by its file's description and signer, with its icon as an RGBA PNG at the size asked", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const program = new AppIdentity(WindowsBackendHarness.fixture("complete-addon.cjs"));
    api.programs = new Map([[program.id, { description: " Notes ", signer: " Example Corp " }]]);
    api.icons = new Map([[program.id, { width: 2, height: 1, bgra: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 128]).buffer }]]);

    const app = await backend.apps.describeAppAsync(program, 64, HangGuard.signal());

    assert.deepEqual([app?.identity, app?.name, app?.publisher], [program, "Notes", "Example Corp"]);
    const icon = PngImage.read(app?.icon ?? new Uint8Array(0));
    assert.deepEqual([icon.width, icon.height, icon.channels, icon.rows()], [2, 1, 4, [[[0, 0, 255, 255], [255, 0, 0, 128]]]]);
    assert.deepEqual(api.named("readProgramIcon"), [[program.id, 64]]);
  });
});
