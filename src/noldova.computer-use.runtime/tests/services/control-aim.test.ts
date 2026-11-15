/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { ControlInfo, ControlRole, ControlSpot, ControlTree, DesktopPoint, DesktopRect, ScrollAmount, WindowInfo } from "@noldova/computer-use.runtime";
import { ToolAbortReason, ToolFailureCode, ToolFailureException } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

const NOTES = RuntimeHarness.notes.identity;
const WINDOW = new WindowInfo(NOTES, "Notes", "100", 42, new DesktopRect(0, 0, 8, 6), false);
const SAVE = new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(7, 5));
const TEXT = new ControlSpot(ControlRole.Edit, "Text", true, true, new DesktopPoint(4, 3));
const STALE = /^The control isn't an ID of the latest read of the window in front, in the latest frame\. Nothing was sent\. Read the window again\.$/;
const GONE = /^The control is gone, changed, disabled or off screen since the window was read\. Nothing was sent\. Read the window again\.$/;
const CHANGED = /^The input was refused: after the pointer reached it, the control was gone, changed, moved or covered, or wasn't found again within a second\. Nothing was sent\./;

describe("a pointer tool's control", () => {
  const summary = "Saves the note.";

  async function readAsync(): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    harness.windows.foreground = WINDOW;
    harness.backend.controls.set(null, new ControlTree([
      new ControlInfo("s", null, NOTES, ControlRole.Button, "Save", null, [], new DesktopRect(6, 5, 2, 1)),
      new ControlInfo("t", null, NOTES, ControlRole.Edit, "Text", "Dear team,", [], new DesktopRect(0, 1, 8, 4)),
      new ControlInfo("w", null, NOTES, ControlRole.Button, "Wide", null, [], new DesktopRect(7, 0, 3, 1))
    ], 0, false));
    await harness.callAsync("computer_read_window", {});
    harness.backend.controls.setSpot("s", SAVE);
    harness.backend.controls.setSpot("t", TEXT);

    return harness;
  }

  it("clicks a control at the point the backend finds it again, raising a request that names it as read", async () => {
    const harness = await readAsync();

    const result = await harness.callAsync("computer_click", { control: "c1", summary });

    assert.deepEqual(result.structured, { clicked: 1 });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.points, t.target]), [["click", [new DesktopPoint(7, 5)], WINDOW.target]]);
    assert.deepEqual(harness.center.records().at(-1)?.details, [
      { name: "input", value: "click" },
      { name: "point", value: "7, 5" },
      { name: "control", value: "button \"Save\"" },
      { name: "button", value: "Left" },
      { name: "count", value: "1" },
      { name: "modifiers", value: "none" },
      { name: "app", value: "Notes" },
      { name: "identity", value: NOTES.id },
      { name: "summary", value: summary }
    ]);
    assert.deepEqual(harness.backend.controls.targets.slice(1), [WINDOW.target, WINDOW.target, WINDOW.target]);
  });

  it("scrolls over, moves onto and drags between controls, and from where the pointer is to one", async () => {
    const harness = await readAsync();
    harness.input.pointer = new DesktopPoint(1, 1);

    await harness.callAsync("computer_scroll", { control: "c2", direction: "down", amount: 2, summary });
    const moved = await harness.callAsync("computer_move", { control: "c2" });
    const dragged = await harness.callAsync("computer_drag", { from: "c1", to: [2, 2], summary });
    const pulled = await harness.callAsync("computer_drag", { to: "c2", summary });

    assert.deepEqual(moved.structured, { moved: [4, 3] });
    assert.deepEqual(dragged.structured, { dragged: [[7, 5], [2, 2]] });
    assert.deepEqual(pulled.structured, { dragged: [[1, 1], [4, 3]] });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.points, t.amount]), [
      ["scroll", [new DesktopPoint(4, 3)], new ScrollAmount(0, 2)],
      ["move", [new DesktopPoint(4, 3)], null],
      ["drag", [new DesktopPoint(7, 5), new DesktopPoint(2, 2)], null],
      ["drag", [new DesktopPoint(1, 1), new DesktopPoint(4, 3)], null]
    ]);
    const details = harness.center.records().filter(t => t.action === "computer-use.controlApp").slice(-4).map(t => t.details.slice(1, 5));
    assert.deepEqual(details, [
      [{ name: "point", value: "4, 3" }, { name: "control", value: "edit \"Text\"" }, { name: "direction", value: "down" }, { name: "amount", value: "2" }],
      [{ name: "point", value: "4, 3" }, { name: "control", value: "edit \"Text\"" }, { name: "app", value: "Notes" }, { name: "identity", value: NOTES.id }],
      [{ name: "from", value: "7, 5" }, { name: "fromControl", value: "button \"Save\"" }, { name: "to", value: "2, 2" }, { name: "button", value: "Left" }],
      [{ name: "from", value: "1, 1" }, { name: "to", value: "4, 3" }, { name: "toControl", value: "edit \"Text\"" }, { name: "button", value: "Left" }]
    ]);
  });

  it("acts on a control in a list of actions", async () => {
    const harness = await readAsync();

    const result = await harness.callAsync("computer_batch", { actions: [{ action: "click", control: "c2" }, { action: "click", control: "c1" }], summary });

    assert.deepEqual(result.structured, { ran: 2, results: [{ clicked: 1 }, { clicked: 1 }] });
    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(4, 3)], [new DesktopPoint(7, 5)]]);
  });

  it("fails as stale for an ID with no frame or no read, of no control, of another window's read, or of a read in a frame of another scale", async () => {
    const harness = await ScreenImages.startAsync();
    harness.windows.foreground = WINDOW;
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, STALE);
    await harness.callAsync("computer_screenshot", {});
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, STALE);

    const read = await readAsync();
    const asked = read.center.records().length;
    await RuntimeHarness.assertFailsAsync(read.callAsync("computer_click", { control: "c9", summary }), ToolFailureCode.Stale, STALE);
    read.windows.foreground = new WindowInfo(NOTES, "Notes", "101", 42, new DesktopRect(0, 0, 8, 6), false);
    await RuntimeHarness.assertFailsAsync(read.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, STALE);
    read.windows.foreground = WINDOW;
    assert.equal(read.center.records().length, asked);
    await read.callAsync("computer_screenshot", { scale: 0.5 });
    await RuntimeHarness.assertFailsAsync(read.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, STALE);
    assert.deepEqual(read.input.sent, []);
  });

  it("keeps a read's IDs through a new screenshot of the display at the read's scale", async () => {
    const harness = await readAsync();
    await harness.callAsync("computer_screenshot", {});

    await harness.callAsync("computer_click", { control: "c1", summary });

    assert.deepEqual(harness.input.sent.map(t => t.points), [[new DesktopPoint(7, 5)]]);
  });

  it("fails as stale when the display changed after the read", async () => {
    const harness = await readAsync();

    harness.backend.capture.set(ScreenImages.captureOf("display-1", new DesktopRect(0, 0, 10, 6), 10, 6));
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, /^The display changed after the latest full screenshot\./);
    assert.equal(harness.backend.controls.targets.length, 1);
  });

  it("fails as stale without raising anything when the control is gone, changed, disabled or off screen", async () => {
    const harness = await readAsync();
    const asked = harness.center.records().length;

    for (const spot of [
      new ControlSpot(ControlRole.Edit, "Save", true, true, new DesktopPoint(7, 5)),
      new ControlSpot(ControlRole.Button, "Saved", true, true, new DesktopPoint(7, 5)),
      new ControlSpot(ControlRole.Button, "Save", false, true, new DesktopPoint(7, 5)),
      new ControlSpot(ControlRole.Button, "Save", true, false, new DesktopPoint(7, 5))
    ]) {
      harness.backend.controls.setSpot("s", spot);
      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, GONE);
    }
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_click", { control: "c3", summary }), ToolFailureCode.Stale, GONE);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails as unavailable, keeping the backend's failure as its cause, when the control can't be found again, and by the call's end when it ends while it is found", async () => {
    const harness = await readAsync();
    const failure = new BackendFailureException("The search broke.");

    harness.backend.controls.findControlAsync = async () => {
      throw failure;
    };
    await assert.rejects(harness.callDirectlyAsync("computer_click", { control: "c1", summary }), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.Unavailable && error.failure.message === "The control could not be found again. Nothing was sent." && error.cause === failure);

    const failing = new AbortController();
    harness.backend.controls.findControlAsync = async () => {
      failing.abort(ToolAbortReason.Cancelled);
      throw new Error("The search stopped.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", { control: "c1", summary }, failing.signal), ToolFailureCode.Cancelled);

    const finding = new AbortController();
    harness.backend.controls.findControlAsync = async () => {
      finding.abort(ToolAbortReason.Cancelled);

      return SAVE;
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", { control: "c1", summary }, finding.signal), ToolFailureCode.Cancelled);
    assert.deepEqual(harness.input.sent, []);
  });

  it("glides to the control first, then finds it again and checks the control at its point before the input", async () => {
    const harness = await readAsync();
    const order: string[] = [];
    harness.input.afterGlide = () => order.push(`glide, ${harness.input.sent.length} sent`);

    await harness.callAsync("computer_click", { control: "c1", summary });

    assert.deepEqual(order, ["glide, 0 sent"]);
    assert.deepEqual(harness.input.glides, [{ target: WINDOW.target, to: new DesktopPoint(7, 5), points: [new DesktopPoint(7, 5)] }]);
    assert.deepEqual(harness.backend.controls.searches, ["s", "s"]);
    assert.deepEqual(harness.backend.controls.hits, [{ handle: "s", at: new DesktopPoint(7, 5) }]);
    assert.deepEqual(harness.input.sent.map(t => t.action), ["click"]);
  });

  it("glides to a drag's start and checks each end that is a control, and doesn't glide first for points alone", async () => {
    const harness = await readAsync();

    await harness.callAsync("computer_drag", { from: "c1", to: "c2", summary });
    await harness.callAsync("computer_drag", { from: [1, 1], to: "c2", summary });
    await harness.callAsync("computer_drag", { from: "c1", to: [2, 2], summary });
    await harness.callAsync("computer_click", { x: 1, y: 1, summary });

    assert.deepEqual(harness.input.glides.map(t => [t.to, t.points]), [
      [new DesktopPoint(7, 5), [new DesktopPoint(7, 5), new DesktopPoint(4, 3)]],
      [new DesktopPoint(1, 1), [new DesktopPoint(1, 1), new DesktopPoint(4, 3)]],
      [new DesktopPoint(7, 5), [new DesktopPoint(7, 5), new DesktopPoint(2, 2)]]
    ]);
    assert.deepEqual(harness.backend.controls.hits, [
      { handle: "s", at: new DesktopPoint(7, 5) },
      { handle: "t", at: new DesktopPoint(4, 3) },
      { handle: "t", at: new DesktopPoint(4, 3) },
      { handle: "s", at: new DesktopPoint(7, 5) }
    ]);
    assert.equal(harness.input.sent.length, 4);
  });

  it("fails as stale with nothing sent when, once the pointer reached it, the control is gone, changed, disabled, off screen, moved or covered", async () => {
    const changes: readonly ((harness: RuntimeHarness) => void)[] = [
      t => t.backend.controls.removeSpot("s"),
      t => t.backend.controls.setSpot("s", new ControlSpot(ControlRole.Edit, "Save", true, true, new DesktopPoint(7, 5))),
      t => t.backend.controls.setSpot("s", new ControlSpot(ControlRole.Button, "Saved", true, true, new DesktopPoint(7, 5))),
      t => t.backend.controls.setSpot("s", new ControlSpot(ControlRole.Button, "Save", false, true, new DesktopPoint(7, 5))),
      t => t.backend.controls.setSpot("s", new ControlSpot(ControlRole.Button, "Save", true, false, new DesktopPoint(7, 5))),
      t => t.backend.controls.setSpot("s", new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(5, 5))),
      t => t.backend.controls.covered.add("s")
    ];
    for (const change of changes) {
      const harness = await readAsync();
      harness.input.afterGlide = () => change(harness);

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, CHANGED);
      assert.deepEqual(harness.input.sent, []);
    }
  });

  it("fails a drag as stale when its far end's control changed once the pointer reached its start", async () => {
    const harness = await readAsync();
    harness.input.afterGlide = () => harness.backend.controls.covered.add("t");

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_drag", { from: "c1", to: "c2", summary }), ToolFailureCode.Stale, CHANGED);
    assert.deepEqual(harness.input.sent, []);
  });

  it("passes on a failure of a search that isn't the backend's own as it is, before or after the glide, sending nothing", async () => {
    const defect = new TypeError("A defect in the module.");
    const finding = await readAsync();
    finding.backend.controls.findControlAsync = async () => {
      throw defect;
    };
    const checking = await readAsync();
    checking.input.afterGlide = () => {
      checking.backend.controls.searchFailure = defect;
    };

    for (const harness of [finding, checking])
      await assert.rejects(harness.callDirectlyAsync("computer_click", { control: "c1", summary }), (error: unknown) => error === defect);
    assert.deepEqual([...finding.input.sent, ...checking.input.sent], []);
  });

  it("fails as stale when the search once the pointer reached the control fails, and by the call's end when the call ends during it", async () => {
    const harness = await readAsync();
    harness.input.afterGlide = () => {
      harness.backend.controls.searchFailure = new BackendFailureException("The search broke.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_click", { control: "c1", summary }), ToolFailureCode.Stale, CHANGED);

    const ending = await readAsync();
    const call = new AbortController();
    ending.input.afterGlide = () => call.abort(ToolAbortReason.Cancelled);
    await RuntimeHarness.assertFailsAsync(ending.callDirectlyAsync("computer_click", { control: "c1", summary }, call.signal), ToolFailureCode.Cancelled);
    assert.deepEqual([...harness.input.sent, ...ending.input.sent], []);
  });

  const refusals: readonly (readonly [string, JsonObject])[] = [
    ["computer_click", { control: "c1", x: 1, summary }],
    ["computer_click", { control: "c1", y: 1, summary }],
    ["computer_click", { control: "", summary }],
    ["computer_scroll", { control: 1, direction: "down", amount: 1, summary }],
    ["computer_move", { control: null }],
    ["computer_drag", { from: "", to: "c1", summary }],
    ["computer_drag", { to: 1, summary }]
  ];
  for (const [name, input] of refusals)
    it(`refuses ${name} with ${JSON.stringify(input)}`, async () => {
      const harness = await readAsync();

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync(name, input), ToolFailureCode.Refused, new RegExp(`^${name} takes `, "u"));
    });
});
