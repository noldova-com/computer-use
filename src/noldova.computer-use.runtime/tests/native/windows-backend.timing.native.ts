/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { ClickCount, DesktopPoint, PointerButton, RefusalException } from "@noldova/computer-use.runtime";
import type { IWindowsOutcomeJson } from "@noldova/computer-use.runtime/windows";

import { GlideRecording } from "./glide-recording.fixture.ts";
import { WindowsDesktopSession } from "./windows-desktop-session.fixture.ts";

const TIMEOUT_MS = WindowsDesktopSession.TIMEOUT_MS;
const EDGE = WindowsDesktopSession.EDGE;
const GLIDE_START_INSET = 40;
const MOVE_AWAY = 600;
const LONGEST_GLIDE_MS = 250;
const PRODUCT_GLIDE_MS = 200;
const ADDON_LONGEST_GLIDE_MS = 1000;
const MOST_OFF_PATH = 2;

describe("the Windows backend's timing on the desktop", { skip: process.platform !== "win32" ? "The Windows backend runs on Windows only." : false }, () => {
  const session = new WindowsDesktopSession();

  before(async () => {
    await session.openAsync();
  });

  after(async () => {
    await session.closeAsync();
  });

  describe("a glide reaches its point within 250 ms, since the product glides for 0.2 s at most, long enough for the person to follow and short enough for a check to stop it, plus 50 ms for the samples' lag; a busy machine delays the JavaScript thread's samples and lengthens the time measured", () => {
    it("glides the pointer to the marker along a straight path, and then clicks it", async t => {
      const front = await session.frontAsync();
      const { point } = await session.findMarkerAsync();
      const start = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);

      const target = (await session.frontAsync()).target;
      assert.ok(WindowsDesktopSession.isInside(front.frame, start) && WindowsDesktopSession.isInside(front.frame, point), "The glide reaches too near the test window's edge.");
      await session.backend.input.movePointerAsync(target, start, AbortSignal.timeout(TIMEOUT_MS));
      const { samples, error } = await session.recordAsync(start, () => session.backend.input.clickAsync(target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)), point);
      const glide = GlideRecording.of(samples, start, point);
      t.diagnostic(`From (${start.x}, ${start.y}) to (${point.x}, ${point.y}): ${glide.describe()}`);

      assert.equal(error, null);
      assert.equal(glide.isArrived, true, `The pointer never reached the marker; it was last read at (${samples.at(-1)?.x}, ${samples.at(-1)?.y}).`);
      assert.ok(glide.maxOffPath <= MOST_OFF_PATH, `The glide strayed ${glide.maxOffPath} pixels from the straight path.`);
      await session.window.takeLineAsync("click ", TIMEOUT_MS);
      t.diagnostic(`timing: ${glide.durationMs.toFixed(1)} ms, limit ${LONGEST_GLIDE_MS} ms`);
    });
  });

  describe("a glide is stopped when its point leaves the test window, whose move after the pointer leaves its start must land within the product's 0.2 s glide; a busy machine that delays the window's thread lengthens the time measured, and past the glide's end lets the glide arrive and click", () => {
    it("reports how soon the test window moves away during a glide to its marker, and whether the click was refused", async t => {
      await session.frontAsync();
      const { point } = await session.findMarkerAsync();
      const start = await session.farFromAsync(point);

      const target = (await session.frontAsync()).target;
      await session.warpAsync(start);
      let leftMs = Number.NaN;
      const lines: string[] = [];
      try {
        const { samples, error } = await session.recordAsync(start, () => session.backend.input.clickAsync(target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)), null, () => {
          leftMs = WindowsDesktopSession.counterMs();
          session.window.send(`move ${MOVE_AWAY} 0`);
        });
        const glide = GlideRecording.of(samples, start, point);
        t.diagnostic(glide.describe());
        assert.ok(!Number.isNaN(leftMs), "The pointer never left the glide's start.");
        lines.push(...await session.window.takeThroughAsync("moved ", TIMEOUT_MS));
        const movedMs = Number(lines.at(-1)?.split(" ")[3]);
        t.diagnostic(`timing: ${(movedMs - leftMs).toFixed(1)} ms, limit ${PRODUCT_GLIDE_MS} ms`);
        const answer = error instanceof RefusalException ? `refused as ${error.reason}, input sent ${String(error.isInputSent)}` : `not refused: ${String(error)}`;
        t.diagnostic(`outcome: the click was ${answer}, and the pointer ${glide.isArrived ? "reached" : "didn't reach"} the marker's point`);
      } finally {
        if (!Number.isNaN(leftMs)) {
          if (!lines.some(u => u.startsWith("moved ")))
            lines.push(...await session.window.takeThroughAsync("moved ", TIMEOUT_MS));
          session.window.send(`move ${-MOVE_AWAY} 0`);
          lines.push(...await session.window.takeThroughAsync("moved ", TIMEOUT_MS));
        }
      }
      lines.push(...await session.enterBarrierAsync(session.window, (await session.frontAsync()).target));
      t.diagnostic(`outcome: the test window reported ${lines.filter(u => u.startsWith("click ")).length} clicks`);
    });
  });

  describe("a drag's end check sees the test window move within the one-second hold on the press point, the longest glide the addon takes; a busy machine that delays the window's thread lengthens the time measured, and past that second lets the drag end on the window", () => {
    it("reports how soon the test window moves away after a drag's press, and whether the drag was refused, releasing the button", async t => {
      const front = await session.frontAsync();
      const { point: from } = await session.findMarkerAsync();
      const to = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
      assert.ok(WindowsDesktopSession.isInside(front.frame, from) && WindowsDesktopSession.isInside(front.frame, to), "The drag reaches too near the test window's edge.");
      await session.backend.input.movePointerAsync(front.target, from, AbortSignal.timeout(TIMEOUT_MS));
      const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.target.app.id };
      session.window.send(`move-on-press ${MOVE_AWAY} 0`);
      await session.window.takeLineAsync("armed", TIMEOUT_MS);
      const startedMs = WindowsDesktopSession.counterMs();
      let outcome: IWindowsOutcomeJson | undefined;
      let moved: Promise<string | undefined> | undefined;
      const takeMovedAsync = async (): Promise<string | undefined> => {
        moved ??= session.window.takeLineAsync("moved ", TIMEOUT_MS).catch(() => undefined);
        return await moved;
      };
      try {
        outcome = await session.addon.drag(target, from.x, from.y, to.x, to.y, GlideRecording.heldSteps(from, to), "Left", [], new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)), session.addon.readPhysicalCount());
        const resumedMs = WindowsDesktopSession.counterMs() - startedMs;
        const movedLine = outcome.inputSent === false ? undefined : await takeMovedAsync();
        const movedAfterMs = movedLine === undefined ? Number.NaN : Number(movedLine.split(" ")[3]) - startedMs;
        if (movedLine !== undefined)
          t.diagnostic(`timing: ${movedAfterMs.toFixed(1)} ms, limit ${ADDON_LONGEST_GLIDE_MS} ms`);
        const moves = movedLine === undefined ? `didn't move within ${TIMEOUT_MS} ms` : `moved ${Math.round(movedAfterMs)} ms after the drag's call`;
        const why = outcome.inputSent === false
          ? "The drag was refused before its press, so the test window wasn't pressed."
          : `The test window ${moves}, and Node resumed from the drag ${Math.round(resumedMs)} ms after its call, later than the addon's last check.`;

        const pointer = await session.backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
        const isAtEnd = Math.hypot(pointer.x - to.x, pointer.y - to.y) <= EDGE;
        t.diagnostic(`outcome: the drag answered ${JSON.stringify(outcome)}, the pointer ${isAtEnd ? "reached" : "didn't reach"} its end at ${pointer.x}, ${pointer.y}; ${why}`);
        assert.equal(WindowsDesktopSession.readButtons(), "None");
      } finally {
        const isPressed = outcome?.inputSent !== false;
        const movedLine = isPressed ? await takeMovedAsync() : undefined;
        if (isPressed)
          await session.window.takeLineAsync("drag ", TIMEOUT_MS).catch(() => undefined);
        let isMoved = movedLine !== undefined;
        if (!isMoved) {
          session.window.send("disarm");
          isMoved = await session.window.takeLineAsync("disarmed ", TIMEOUT_MS) === "disarmed False";
        }
        if (isMoved) {
          session.window.send(`move ${-MOVE_AWAY} 0`);
          await session.window.takeLineAsync("moved ", TIMEOUT_MS);
        }
      }
    });
  });

  describe("a stop set as the pointer leaves the press point reaches the drag within its one-second glide, the longest the addon takes; a busy or stalled JavaScript thread sees the pointer leave late, which lengthens the time measured, and past that second lets the drag complete", () => {
    it("reports how soon a stop reaches a pressed drag, and whether it stopped short of its end, releasing the button where the pointer is", async t => {
      const front = await session.frontAsync();
      const { point: from } = await session.findMarkerAsync();
      const to = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
      await session.backend.input.movePointerAsync(front.target, from, AbortSignal.timeout(TIMEOUT_MS));
      const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.target.app.id };
      const stop = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
      let outcome: IWindowsOutcomeJson | null = null;
      let stoppedMs = Number.NaN;
      const startedMs = WindowsDesktopSession.counterMs();
      const { error } = await session.recordAsync(from, async () => {
        outcome = await session.addon.drag(target, from.x, from.y, to.x, to.y, GlideRecording.slowSteps(from, to), "Left", [], stop, session.addon.readPhysicalCount());
      }, null, () => {
        Atomics.store(stop, 0, 1);
        stoppedMs = WindowsDesktopSession.counterMs() - startedMs;
      });
      assert.ok(!Number.isNaN(stoppedMs), "The pointer never left the press point.");
      t.diagnostic(`timing: ${stoppedMs.toFixed(1)} ms, limit ${ADDON_LONGEST_GLIDE_MS} ms`);
      assert.equal(error, null);

      const pointer = await session.backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
      const [, dx, dy] = (await session.window.takeLineAsync("drag ", TIMEOUT_MS)).split(" ");
      const isAtEnd = Math.hypot(pointer.x - to.x, pointer.y - to.y) <= EDGE;
      t.diagnostic(`outcome: the drag answered ${JSON.stringify(outcome)}, and the pointer ${isAtEnd ? "reached" : "didn't reach"} its end at ${pointer.x}, ${pointer.y}`);
      assert.ok(
        Math.abs(Number(dx) - (pointer.x - from.x)) <= 1 && Math.abs(Number(dy) - (pointer.y - from.y)) <= 1,
        `The drag moved ${dx}, ${dy}, with the pointer at ${pointer.x}, ${pointer.y} from ${from.x}, ${from.y}.`
      );
      assert.equal(WindowsDesktopSession.readButtons(), "None");
    });
  });
});
