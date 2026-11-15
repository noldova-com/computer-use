/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it, type TestContext } from "node:test";

import { BorderColorInvalidException } from "@noldova/computer-use.protocol";
import { Display } from "@noldova/computer-use.runtime";
import { JsonException, type JsonObject } from "@noldova/context.json";
import { PermissionOption } from "@noldova/desktop.runtime";

import { BorderCalls } from "./border-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

class BorderRun {
  public readonly calls: BorderCalls;
  public readonly harness: RuntimeHarness;
  private readonly t: TestContext;

  public constructor(t: TestContext, harness: RuntimeHarness) {
    this.t = t;
    this.harness = harness;
    this.calls = new BorderCalls(t, harness.backend.border);
  }

  public async controlAsync(): Promise<void> {
    const shown = this.calls.nextAsync();
    await this.controlWithoutCallAsync();
    await shown;
  }

  public async controlWithoutCallAsync(): Promise<void> {
    const call = this.harness.callAsync("computer_list_displays", {});
    await Promise.race([call, this.harness.answerAsync(RuntimeHarness.controlScreen, PermissionOption.AllowOnce)]);
    await call;
  }

  public async stopAsync(): Promise<void> {
    const hidden = this.calls.nextAsync();
    assert.deepEqual(await this.harness.context.callMethodAsync("computer-use.stop", {}), {});
    await hidden;
  }

  public async writeAsync(name: string, value: boolean): Promise<void> {
    const changed = this.calls.nextAsync();
    this.harness.context.settings.write(name, value);
    await changed;
  }

  public async setColorAsync(payload: JsonObject): Promise<void> {
    const shown = this.calls.nextAsync();
    assert.deepEqual(await this.harness.context.callMethodAsync(SET_COLOR, payload), {});
    await shown;
  }

  public async passCheckAsync(): Promise<void> {
    const checked = this.calls.nextAsync();
    this.t.mock.timers.tick(CHECK_MS);
    await checked;
  }
}

const SHOW_BORDER = "computer-use.showBorder";
const SET_COLOR = "computer-use.borderColorSet";
const CHECK_MS = 1000;
const PRIMARY = new Display("1", 0, 0, 1920, 1080, 1, true);
const SCALED = new Display("2", -1280, 0, 2560, 1440, 1.5, false);
const PRIMARY_FRAME = [0, 0, 1920, 1080, 4];
const SCALED_FRAME = [-1280, 0, 2560, 1440, 4];

function kitAccent(): string {
  const json: unknown = JSON.parse(fs.readFileSync(new URL("../../generated/kit-accent.json", import.meta.resolve("@noldova/computer-use.runtime")), "utf8"));
  assert.ok(typeof json === "object" && json !== null && "color" in json && typeof json.color === "string");

  return json.color;
}

async function startAsync(t: TestContext, displays: readonly Display[] = [PRIMARY, SCALED]): Promise<BorderRun> {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const harness = await RuntimeHarness.startAsync();
  harness.backend.displays.displays = displays;
  harness.backend.border.units = 1;

  return new BorderRun(t, harness);
}

describe("the border", () => {
  it("is on by default", async t => {
    const { harness } = await startAsync(t);

    assert.equal(harness.context.settings.read(SHOW_BORDER), true);
  });

  it("shows around every display in the kit's accent while a session controls the screen, hides when control stops, and stays hidden as control resumes", async t => {
    const run = await startAsync(t);
    run.harness.backend.border.units = 1.5;

    await run.controlAsync();
    assert.deepEqual(run.harness.backend.border.calls, [{ color: kitAccent(), frames: [[0, 0, 1920, 1080, 6], [-1280, 0, 2560, 1440, 6]] }]);
    await run.stopAsync();
    run.harness.tools.resumeAll();
    await run.controlAsync();

    assert.deepEqual(run.harness.backend.border.calls.slice(1).map(t => t?.color ?? null), [null, kitAccent()]);
  });

  it("shows again every second over the displays as they are then, and stops checking once hidden", async t => {
    const run = await startAsync(t, [PRIMARY]);
    await run.controlAsync();

    run.harness.backend.displays.displays = [PRIMARY, SCALED];
    await run.passCheckAsync();
    await run.passCheckAsync();
    await run.stopAsync();
    t.mock.timers.tick(CHECK_MS);
    run.harness.tools.resumeAll();
    await run.controlAsync();

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.frames ?? null), [[PRIMARY_FRAME], [PRIMARY_FRAME, SCALED_FRAME], [PRIMARY_FRAME, SCALED_FRAME], null, [PRIMARY_FRAME, SCALED_FRAME]]);
  });

  it("hides when the person turns its setting off, and shows when it's turned on again", async t => {
    const run = await startAsync(t, [PRIMARY]);
    await run.controlAsync();

    await run.writeAsync(SHOW_BORDER, false);
    t.mock.timers.tick(CHECK_MS);
    await run.writeAsync(SHOW_BORDER, true);

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.frames ?? null), [[PRIMARY_FRAME], null, [PRIMARY_FRAME]]);
  });

  it("never shows while its setting is off", async t => {
    const run = await startAsync(t, [PRIMARY]);
    run.harness.context.settings.write(SHOW_BORDER, false);

    await run.controlWithoutCallAsync();
    t.mock.timers.tick(CHECK_MS);
    await run.writeAsync(SHOW_BORDER, true);
    await run.passCheckAsync();

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.frames ?? null), [[PRIMARY_FRAME], [PRIMARY_FRAME]]);
  });

  it("shows in the colour the app sends, upper-cased, and in the one it sends again once the module is switched off and on", async t => {
    const run = await startAsync(t, [PRIMARY]);
    await run.controlAsync();

    await run.setColorAsync({ color: "#4daafc" });
    await run.harness.switchAsync(false);
    await run.harness.switchAsync(true);
    const harness = run.harness;
    assert.deepEqual(await harness.context.callMethodAsync(SET_COLOR, { color: "#123456" }), {});
    await run.controlAsync();

    assert.deepEqual(harness.backend.border.calls.map(t => t?.color ?? null), [kitAccent(), "#4DAAFC", null, "#123456"]);
  });

  it("refuses a colour that isn't #RRGGBB, or a payload with another field, and shows nothing new", async t => {
    const run = await startAsync(t, [PRIMARY]);
    await run.controlAsync();

    for (const payload of [{ color: "#4AF" }, { color: "blue" }])
      await assert.rejects(run.harness.context.callMethodAsync(SET_COLOR, payload), BorderColorInvalidException);
    for (const payload of [{ color: 5 }, {}, { color: "#4DAAFC", alpha: 1 }])
      await assert.rejects(run.harness.context.callMethodAsync(SET_COLOR, payload), JsonException);
    await run.setColorAsync({ color: "#123456" });

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.color ?? null), [kitAccent(), "#123456"]);
  });

  it("writes a show it can't make to the module's log and tries again at the next check", async t => {
    const run = await startAsync(t, [PRIMARY]);
    run.harness.backend.border.showFailure = new Error("no window");

    await run.controlAsync();
    run.harness.backend.border.showFailure = null;
    await run.passCheckAsync();

    assert.equal(run.harness.backend.border.calls.length, 2);
    assert.deepEqual(run.harness.context.written, ["Computer use couldn't show or hide its border: Error: no window"]);
  });

  it("tries the hide three times a check apart as the module is switched off, stops trying then, and shows nothing as it's switched on again", async t => {
    const run = await startAsync(t, [PRIMARY]);
    const first = run.harness.context;
    await run.controlAsync();
    run.harness.backend.border.hideFailure = new Error("gone");

    const hidden = run.calls.reachAsync(3);
    const off = run.harness.switchAsync(false);
    await hidden;
    await run.passCheckAsync();
    await run.passCheckAsync();
    await off;
    await run.harness.switchAsync(true);
    t.mock.timers.tick(CHECK_MS);

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.color ?? null), [kitAccent(), null, null, null, null]);
    assert.deepEqual([first.written, run.harness.context.written], [Array(4).fill("Computer use couldn't show or hide its border: Error: gone"), []]);
  });

  it("tries no further hide for a setting change that comes after its last hide as the module is switched off", async t => {
    const run = await startAsync(t, [PRIMARY]);
    const first = run.harness.context;
    await run.controlAsync();
    run.harness.backend.border.hideFailure = new Error("gone");

    const hidden = run.calls.reachAsync(3);
    const off = run.harness.switchAsync(false);
    await hidden;
    await run.passCheckAsync();
    t.mock.timers.tick(CHECK_MS);
    first.settings.write(SHOW_BORDER, false);
    await off;

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.color ?? null), [kitAccent(), null, null, null, null]);
    assert.deepEqual(first.written, Array(4).fill("Computer use couldn't show or hide its border: Error: gone"));
  });

  it("tries a hide that failed as the module is switched off again a check later, and stops once it hides", async t => {
    const run = await startAsync(t, [PRIMARY]);
    await run.controlAsync();
    run.harness.backend.border.hideFailure = new Error("gone");

    const hidden = run.calls.reachAsync(3);
    const off = run.harness.switchAsync(false);
    await hidden;
    run.harness.backend.border.hideFailure = null;
    await run.passCheckAsync();
    await off;
    t.mock.timers.tick(CHECK_MS);

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.color ?? null), [kitAccent(), null, null, null]);
    assert.deepEqual(run.harness.context.written, Array(2).fill("Computer use couldn't show or hide its border: Error: gone"));
  });

  it("hides when the module is switched off while it shows", async t => {
    const run = await startAsync(t, [PRIMARY]);
    await run.controlAsync();

    await run.harness.switchAsync(false);

    assert.deepEqual(run.harness.backend.border.calls.map(t => t?.color ?? null), [kitAccent(), null]);
  });
});
