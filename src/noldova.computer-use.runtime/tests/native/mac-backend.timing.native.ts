/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, before, describe, it, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { ClickCount, DesktopPoint, GlidePath, PointerButton, RefusalException, type WindowImage, type WindowInfo } from "@noldova/computer-use.runtime";
import { MacBackend, MacScriptProcess } from "@noldova/computer-use.runtime/macos";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";

import { GlideRecording, type IPointerSample } from "./glide-recording.fixture.ts";
import { type IHandCount, MacHand } from "./mac-hand.fixture.ts";
import { MacPointerRecorder } from "./mac-pointer-recorder.fixture.ts";
import { MacTestWindow } from "./mac-test-window.fixture.ts";

const TIMEOUT_MS = 10_000;
const EDGE = 8;
const GLIDE_START_INSET = 40;
const RECORD_MS = 500;
const LONGEST_GLIDE_MS_A_PERSON_STILL_FOLLOWS = 250;
const MERGE_MS_OF_THE_WINDOW_SERVER = 40;
const LATEST_HAND_MOVE_MS_BEFORE_THE_SECOND_STEP_AND_ITS_MERGE = 360;
const COVER_AFTER_GLIDE_START_MS = 40;
const ASIDE = 80;
const TWO_STEPS = 14;
const GLIDE_MOVES = 2;
const HAND_ASIDE = 1;
const HAND_AFTER_COUNTED_MS_CLEAR_OF_THE_WINDOW_SERVERS_MERGE = 80;
const GAP_STEP_MS_ROOM_FOR_THE_HANDS_MOVE = 400;
const HAND_COUNT_AFTER_SECOND_STEP_MS = 500;
const HEARTBEATS_THE_RUNTIME_MISSES_BEFORE_IT_STOPS = 3;
const HAND_COUNTED_MS_AFTER_THE_GLIDES_LAST_MOVE = HAND_AFTER_COUNTED_MS_CLEAR_OF_THE_WINDOW_SERVERS_MERGE + 2 * MERGE_MS_OF_THE_WINDOW_SERVER;

function isMarker(red: number, green: number, blue: number): boolean {
  return red > 180 && green < 100 && blue > 180;
}

function isInside(frame: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }, point: DesktopPoint): boolean {
  return point.x >= frame.x + EDGE && point.x < frame.x + frame.width - EDGE && point.y >= frame.y + EDGE && point.y < frame.y + frame.height - EDGE;
}

function findMarkerPixel(image: WindowImage): { readonly x: number; readonly y: number } {
  const found: { x: number; y: number }[] = [];
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const at = (y * image.width + x) * 4;
      const [blue = 0, green = 0, red = 0] = image.bgra.subarray(at, at + 3);
      if (isMarker(red, green, blue))
        found.push({ x, y });
    }
  const centre = found[Math.floor(found.length / 2)];
  assert.ok(centre !== undefined, `The test window's image of ${image.width} by ${image.height} pixels shows no marker.`);

  return centre;
}

describe("the macOS backend's timing promises, each a limit that a busy machine can push a run over, so the timing run judges each from its median", { skip: process.platform !== "darwin" ? "The macOS backend runs on macOS only." : false }, () => {
  const starter = new ProgramStarterDouble();
  const backend = MacBackend.load(starter);
  let window: MacTestWindow;
  let windowId = "";

  async function frontAsync(): Promise<WindowInfo> {
    const front = await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS));
    assert.ok(front !== null, `No window is in front; in front: ${await MacTestWindow.describeFrontAsync(TIMEOUT_MS)}.`);
    assert.deepEqual([front.target.processId, front.target.windowId], [window.pid, windowId], `The test window isn't in front; in front: ${await MacTestWindow.describeFrontAsync(TIMEOUT_MS)}.`);

    return front;
  }

  async function findMarkerAsync(): Promise<DesktopPoint> {
    const stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
    const listed = stack.windows.find(t => t.windowId === windowId);
    assert.ok(listed !== undefined, `The test window ${windowId} isn't listed.`);
    const image = await backend.capture.captureWindowAsync(listed, AbortSignal.timeout(TIMEOUT_MS));
    assert.ok(image !== null, "The test window couldn't be captured.");
    const centre = findMarkerPixel(image);
    const frame = listed.frame;

    return new DesktopPoint(frame.x + Math.floor((centre.x + 0.5) * frame.width / image.width), frame.y + Math.floor((centre.y + 0.5) * frame.height / image.height));
  }

  async function glideByHandAsync(from: DesktopPoint, middle: DesktopPoint, to: DesktopPoint, handTo: DesktopPoint): Promise<{ readonly outcome: unknown; readonly counted: IHandCount }> {
    const front = await frontAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
    const steps = [{ atMs: 0, x: middle.x, y: middle.y }, { atMs: GAP_STEP_MS_ROOM_FOR_THE_HANDS_MOVE, x: to.x, y: to.y }];
    let hand: MacHand | undefined;
    let input: MacScriptProcess | undefined;

    await MacTestWindow.warpAsync(from, TIMEOUT_MS);
    try {
      hand = await MacHand.startCountedAsync(handTo, TIMEOUT_MS);
      input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
      await input.callAsync("startWatch", {});
      await hand.armAsync(1, HAND_AFTER_COUNTED_MS_CLEAR_OF_THE_WINDOW_SERVERS_MERGE, TIMEOUT_MS, GAP_STEP_MS_ROOM_FOR_THE_HANDS_MOVE + HAND_COUNT_AFTER_SECOND_STEP_MS);
      const outcome = await input.callAsync("glidePointer", { target, points: [{ x: to.x, y: to.y }], steps });

      return { outcome, counted: await hand.countedAsync(TIMEOUT_MS) };
    } finally {
      await hand?.endAsync();
      await input?.closeAsync();
    }
  }

  function reportTiming(t: TestContext, measuredMs: number, limitMs: number): void {
    t.diagnostic(`timing: ${measuredMs.toFixed(1)} ms, limit ${limitMs} ms`);
  }

  function describeOutcome(outcome: unknown): string {
    if (outcome === null)
      return "sent";
    if (typeof outcome === "string")
      return outcome;
    if (outcome instanceof RefusalException)
      return `refused ${outcome.reason.value}, input sent ${outcome.isInputSent}`;

    return outcome instanceof Error ? `failed: ${outcome.message}` : JSON.stringify(outcome);
  }

  function reportHandGlide(t: TestContext, outcome: unknown, counted: IHandCount, handTo: DesktopPoint): void {
    const firstCount = counted.rises[0];
    reportTiming(t, counted.postedMs === null || firstCount === undefined ? TIMEOUT_MS : counted.postedMs - firstCount.atMs, LATEST_HAND_MOVE_MS_BEFORE_THE_SECOND_STEP_AND_ITS_MERGE);
    t.diagnostic(`outcome: ${describeOutcome(outcome)}; the window server counted ${counted.events} pointer events, the pointer at ${counted.pointer.x}, ${counted.pointer.y}, the hand's point ${handTo.x}, ${handTo.y}; after the hand was armed, in milliseconds, the hand ${counted.times}`);
  }

  before(async () => {
    window = await MacTestWindow.openAsync();
    await window.takeLineAsync("ready ", TIMEOUT_MS);
    windowId = String(window.windowNumber);
  });

  after(async () => {
    try {
      await window?.closeAsync(TIMEOUT_MS);
    } finally {
      await backend.closeAsync();
      await starter.endAsync();
    }
  });

  it("glides the pointer to the marker within the longest glide a person still follows as one motion, along a straight path, eased out, and then clicks it; a busy machine slows the recorder's readings and the glide's steps", async t => {
    const front = await frontAsync();
    const point = await findMarkerAsync();
    const start = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
    assert.ok(isInside(front.frame, start) && isInside(front.frame, point), "The glide reaches too near the test window's edge.");
    await backend.input.movePointerAsync(front.target, start, AbortSignal.timeout(TIMEOUT_MS));
    const recorder = await MacPointerRecorder.startAsync(start, RECORD_MS, TIMEOUT_MS);
    let samples: readonly IPointerSample[];
    try {
      await backend.input.clickAsync(front.target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));
      samples = await recorder.samplesAsync();
    } finally {
      await recorder.endAsync();
    }
    const glide = GlideRecording.of(samples, start, point);
    t.diagnostic(`From (${start.x}, ${start.y}) to (${point.x}, ${point.y}): ${glide.describe()}`);
    reportTiming(t, glide.durationMs, LONGEST_GLIDE_MS_A_PERSON_STILL_FOLLOWS);

    assert.ok(glide.isArrived, "The pointer never reached the marker.");
    assert.ok(glide.maxOffPath <= 2, `The glide strayed ${glide.maxOffPath} points from the straight path.`);
    await window.takeLineAsync("click ", TIMEOUT_MS);
  });

  it("keeps the person's-input watch beating while it types a long text in chunks, never as long apart as the three heartbeats the runtime takes for a lost watch; a busy machine slows the input process's answers between chunks", async t => {
    const target = (await frontAsync()).target;
    const text = "abcdefghij".repeat(40);
    const chunk = backend.input.maxTextChunkLength;
    const beats: number[] = [];
    const onBeat = backend.physicalInput.onHeartbeat(() => beats.push(performance.now()));
    await backend.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
    const start = performance.now();
    try {
      for (let at = 0; at < text.length; at += chunk)
        await backend.input.typeTextAsync(target, text.slice(at, at + chunk), AbortSignal.timeout(TIMEOUT_MS));
    } finally {
      await backend.physicalInput.stopAsync();
      onBeat[Symbol.dispose]();
    }
    const end = performance.now();
    const marks = [start, ...beats.filter(u => u > start && u < end), end];
    const longestGapMs = Math.max(...marks.slice(1).map((u, index) => u - (marks[index] ?? start)));
    t.diagnostic(`typing ${text.length} units in chunks of ${chunk} took ${(end - start).toFixed(0)} ms`);
    reportTiming(t, longestGapMs, HEARTBEATS_THE_RUNTIME_MISSES_BEFORE_IT_STOPS * backend.physicalInput.heartbeatIntervalMs);

    assert.equal(await window.takeLineAsync(`text ${text}`, TIMEOUT_MS), `text ${text}`);
  });

  it("puts another window of the test window's app in front, over the whole test window, within the glide across the test window when told 40 ms into it, reporting whether the glide was refused, with the whole glide inside the test window's frame and no click sent; a busy machine covers the window later", async t => {
    const front = await frontAsync();
    const point = await findMarkerAsync();
    const frame = front.frame;
    const start = new DesktopPoint(
      point.x < frame.x + frame.width / 2 ? frame.x + frame.width - GLIDE_START_INSET : frame.x + GLIDE_START_INSET,
      point.y < frame.y + frame.height / 2 ? frame.y + frame.height - GLIDE_START_INSET : frame.y + GLIDE_START_INSET);
    assert.ok(isInside(frame, start) && isInside(frame, point), `The glide from (${start.x}, ${start.y}) to (${point.x}, ${point.y}) leaves the test window's frame.`);
    const glideMs = GlidePath.between(start, point).durationMs;

    await MacTestWindow.warpAsync(start, TIMEOUT_MS);
    const began = Date.now();
    const sending = backend.input.glidePointerAsync(front.target, point, [point], AbortSignal.timeout(TIMEOUT_MS)).then(() => null, (reason: unknown) => reason);
    await delay(COVER_AFTER_GLIDE_START_MS);
    window.send("cover");
    const error = await sending;
    try {
      const listedMs = Number((await window.takeLineAsync("listed at ", TIMEOUT_MS)).slice("listed at ".length)) - began;
      assert.equal(await window.takeLineAsync("covered", TIMEOUT_MS), "covered");
      reportTiming(t, listedMs, glideMs);
      t.diagnostic(`outcome: ${describeOutcome(error)}, the cover listed in front ${listedMs.toFixed(1)} ms after the glide of ${glideMs} ms began`);
    } finally {
      window.send("uncover");
      assert.equal(await window.takeLineAsync("uncovered", TIMEOUT_MS), "uncovered");
    }
    const clicks = (await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(u => u.startsWith("click "));

    assert.deepEqual(clicks, [], `The glide ${describeOutcome(error)}, and the window logged ${JSON.stringify(clicks)}.`);
  });

  it("moves the person's hand off a glide's path well before its second step, 400 ms after its first, reporting whether the glide stopped there; a busy machine posts the hand's move later", async t => {
    const point = await findMarkerAsync();
    const from = new DesktopPoint(point.x + TWO_STEPS, point.y);
    const middle = new DesktopPoint(point.x + TWO_STEPS / 2, point.y);
    const handTo = new DesktopPoint(middle.x, middle.y - ASIDE);

    const { outcome, counted } = await glideByHandAsync(from, middle, point, handTo);

    reportHandGlide(t, outcome, counted, handTo);
  });

  it("moves the person's hand, seen only in the window server's count, well before a glide's last step, reporting whether the glide stopped there; a busy machine posts the hand's move later", async t => {
    const point = await findMarkerAsync();
    const from = new DesktopPoint(point.x + TWO_STEPS, point.y);
    const middle = new DesktopPoint(point.x + TWO_STEPS / 2, point.y);
    const handTo = new DesktopPoint(middle.x + HAND_ASIDE, middle.y);

    const { outcome, counted } = await glideByHandAsync(from, middle, point, handTo);

    reportHandGlide(t, outcome, counted, handTo);
  });

  it("counts the person's hand, seen only in the window server's count, soon after a glide's last move and clear of its merge, reporting whether a click after it was refused, and the window gets the click only when it was sent; a busy machine counts the hand later, and a merged count leaves the click untried", async t => {
    const point = await findMarkerAsync();
    const aside = new DesktopPoint(point.x + HAND_ASIDE, point.y);
    const fresh = MacBackend.load(starter);
    let hand: MacHand | undefined;
    let refusal: unknown = "not tried";

    await MacTestWindow.warpAsync(new DesktopPoint(point.x + TWO_STEPS, point.y), TIMEOUT_MS);
    try {
      hand = await MacHand.startCountedAsync(aside, TIMEOUT_MS);
      await fresh.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
      const target = (await frontAsync()).target;
      await hand.armAsync(GLIDE_MOVES, HAND_AFTER_COUNTED_MS_CLEAR_OF_THE_WINDOW_SERVERS_MERGE, TIMEOUT_MS);
      const glided = await fresh.input.glidePointerAsync(target, point, [point], AbortSignal.timeout(TIMEOUT_MS)).then(() => null, (error: unknown) => error);
      const counted = await hand.countedAsync(TIMEOUT_MS);
      const glideCounted = counted.rises.find(u => u.count >= GLIDE_MOVES);
      const handCounted = counted.rises.find(u => u.count > GLIDE_MOVES);
      reportTiming(t, glideCounted === undefined || handCounted === undefined ? TIMEOUT_MS : handCounted.atMs - glideCounted.atMs, HAND_COUNTED_MS_AFTER_THE_GLIDES_LAST_MOVE);
      if (glided !== null || counted.events !== GLIDE_MOVES + 1 || counted.pointer.x !== aside.x || counted.pointer.y !== aside.y) {
        t.diagnostic(`The glide ${glided === null ? "went on to its end" : `ended with ${String(glided)}`}; the window server counted ${counted.events} of the glide's ${GLIDE_MOVES} moves and the hand's, and the pointer was at ${counted.pointer.x}, ${counted.pointer.y}, not at the hand's ${aside.x}, ${aside.y}, so the click isn't tried in this run; the hand ${counted.times}.`);
        return;
      }
      refusal = await fresh.input.clickAsync(target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)).then(() => null, (error: unknown) => error);
      t.diagnostic(`outcome: ${describeOutcome(refusal)}; the hand ${counted.times}`);
    } finally {
      await hand?.endAsync();
      await fresh.physicalInput.stopAsync();
      await fresh.closeAsync();
    }
    const clicks = (await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(u => u.startsWith("click "));
    assert.equal(clicks.length, refusal === null ? 1 : 0, `The click ${describeOutcome(refusal)}, and the window logged ${JSON.stringify(clicks)}.`);
  });
});
