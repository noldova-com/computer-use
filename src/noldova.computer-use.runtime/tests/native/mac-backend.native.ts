/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { AppIdentity, BorderFrame, ClickCount, type ControlInfo, ControlRole, ControlState, DesktopPoint, DesktopRect, InputTarget, KeyName, ModifierKey, PointerButton, RefusalException, RefusalReason, RuntimePart, ScrollAmount, type StackedWindow, type WindowImage, type WindowInfo, type WindowStack } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolContentKind, ToolFailureException, type ToolResult } from "@noldova/desktop.runtime";
import { MacBackend, MacScriptFailedException, MacScriptProcess } from "@noldova/computer-use.runtime/macos";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";
import { RecordingPermissionCenter } from "../doubles/recording-permission-center.fixture.ts";
import { RuntimePartContextDouble } from "../doubles/runtime-part-context-double.fixture.ts";
import { PngImage } from "../services/png-image.fixture.ts";

import { GlideRecording } from "./glide-recording.fixture.ts";
import { MacCoverWindow } from "./mac-cover-window.fixture.ts";
import { MacHand } from "./mac-hand.fixture.ts";
import { MacKeyPanel } from "./mac-key-panel.fixture.ts";
import { MacPointerRecorder } from "./mac-pointer-recorder.fixture.ts";
import { MacTestWindow } from "./mac-test-window.fixture.ts";

const EDGE = 8;
const MARKER_SIZE = 48;
const COVER_SIDE = 120;
const CAPTURE_TIMES = 10;
const TIMEOUT_MS = 10_000;
const FILL = 64;
const POLL_MS = 50;
const GLIDE_START_INSET = 40;
const RECORD_MS = 500;
const FAR_GLIDE = 620;
const MOVE_AWAY = 600;
const ASIDE = 80;
const HAND_ASIDE = 1;
const TWO_STEPS = 14;
const SECOND_STEP_MS = 20;
const HEARTBEATS = 2;
const LEFT_BUTTON = "ObjC.import(\"CoreGraphics\"); String($.CGEventSourceButtonState(0, 0))";
const FRONT_PROCESS = "ObjC.import(\"AppKit\"); String($.NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier)";
const FRONT_POLL_MS = 100;
const SECOND_BUNDLE = "com.noldova.computer-use.NativeTestWindow.Second";
const PERSON_INPUT_BEFORE_SEND = "--person-input-before-send";

class ReadRow {
  public readonly handle: string;
  public readonly role: string;
  public readonly name: string;

  private constructor(handle: string, role: string, name: string) {
    this.handle = handle;
    this.role = role;
    this.name = name;
  }

  public static read(row: unknown): ReadRow {
    if (typeof row !== "object" || row === null || !("handle" in row) || !("role" in row) || !("name" in row)
      || typeof row.handle !== "string" || typeof row.role !== "string" || typeof row.name !== "string")
      throw new Error(`The read's row ${JSON.stringify(row)} isn't a handle, a role and a name.`);

    return new ReadRow(row.handle, row.role, row.name);
  }
}

class ReadSlice {
  public readonly read: number;
  public readonly controls: readonly ReadRow[];
  public readonly isTimedOut: boolean;
  public readonly isDone: boolean;

  private constructor(read: number, controls: readonly ReadRow[], isTimedOut: boolean, isDone: boolean) {
    this.read = read;
    this.controls = controls;
    this.isTimedOut = isTimedOut;
    this.isDone = isDone;
  }

  public static read(answer: unknown): ReadSlice {
    if (typeof answer !== "object" || answer === null || !("read" in answer) || !("controls" in answer) || !("timedOut" in answer) || !("isDone" in answer)
      || typeof answer.read !== "number" || !Array.isArray(answer.controls) || typeof answer.timedOut !== "boolean" || typeof answer.isDone !== "boolean")
      throw new Error(`The input process answered ${JSON.stringify(answer)}, not a slice of a read.`);
    const rows: unknown[] = answer.controls;

    return new ReadSlice(answer.read, rows.map(t => ReadRow.read(t)), answer.timedOut, answer.isDone);
  }
}

interface IRequestTarget {
  readonly windowId: string;
  readonly processId: number;
  readonly bundleId: string;
}

class MalformedRequest {
  public readonly name: string;
  public readonly method: string;
  public readonly scriptMessage: string;
  private readonly build: (target: IRequestTarget, point: DesktopPoint) => JsonObject;

  public constructor(name: string, method: string, scriptMessage: string, build: (target: IRequestTarget, point: DesktopPoint) => JsonObject) {
    this.name = name;
    this.method = method;
    this.scriptMessage = scriptMessage;
    this.build = build;
  }

  public parametersAt(target: IRequestTarget, point: DesktopPoint): JsonObject {
    return this.build(target, point);
  }
}

const MALFORMED_REQUESTS: readonly MalformedRequest[] = [
  new MalformedRequest("a click count of 4", "click", "Error: The request's count isn't a whole number from 1 to 3.",
    (target, point) => ({ target: { ...target }, x: point.x, y: point.y, button: "Left", count: 4, modifiers: [] })),
  new MalformedRequest("a scroll of 51 steps down", "scroll", "Error: The request's deltaY isn't a whole number from -50 to 50.",
    (target, point) => ({ target: { ...target }, x: point.x, y: point.y, deltaX: 0, deltaY: 51, modifiers: [] })),
  new MalformedRequest("a click whose x is text", "click", "Error: The request's x isn't a finite number.",
    (target, point) => ({ target: { ...target }, x: String(point.x), y: point.y, button: "Left", count: 1, modifiers: [] })),
  new MalformedRequest("a click whose target has no bundle identifier", "click", "Error: The request's bundleId isn't text.",
    (target, point) => ({ target: { windowId: target.windowId, processId: target.processId }, x: point.x, y: point.y, button: "Left", count: 1, modifiers: [] }))
];

async function failureOfAsync(input: MacScriptProcess, method: string, parameters: JsonObject): Promise<unknown> {
  try {
    return { answered: await input.callAsync(method, parameters) };
  } catch (error) {
    return error;
  }
}

function readGrants(answer: unknown): readonly string[] {
  if (typeof answer !== "object" || answer === null || !("screenRecording" in answer) || !("accessibility" in answer)
    || typeof answer.screenRecording !== "boolean" || typeof answer.accessibility !== "boolean")
    throw new Error(`The input process answered ${JSON.stringify(answer)}, not its grants.`);

  return [answer.screenRecording ? "" : "Screen Recording", answer.accessibility ? "" : "Accessibility"].filter(t => t !== "");
}

function isMarker(red: number, green: number, blue: number): boolean {
  return red > 180 && green < 100 && blue > 180;
}

function isFill(red: number, green: number, blue: number): boolean {
  return red === FILL && green === FILL && blue === FILL;
}

function isLime(red: number, green: number, blue: number): boolean {
  return red < 180 && green > 200 && blue < 100;
}

function isInside(frame: DesktopRect, point: DesktopPoint): boolean {
  return point.x >= frame.x + EDGE && point.x < frame.x + frame.width - EDGE && point.y >= frame.y + EDGE && point.y < frame.y + frame.height - EDGE;
}

const COLOR_SLACK = 12;

function readDisplayColors(strips: readonly DesktopRect[]): readonly (readonly number[])[] {
  const script = `ObjC.import("AppKit");
const strips = ${JSON.stringify(strips.map(t => [t.x, t.y]))};
const screens = [...Array(Number($.NSScreen.screens.count)).keys()].map(t => $.NSScreen.screens.objectAtIndex(t));
const mainHeight = screens[0].frame.size.height;
strips.map(([x, y]) => {
  const screen = screens.find(t => t.frame.origin.x === x && mainHeight - t.frame.origin.y - t.frame.size.height === y) ?? screens[0];
  const color = $.NSColor.colorWithSRGBRedGreenBlueAlpha(0, 0x5F / 255, 0xB8 / 255, 1).colorUsingColorSpace(screen.colorSpace);
  return [color.redComponent, color.greenComponent, color.blueComponent].map(t => Math.round(t * 255)).join(" ");
}).join("\\n");`;
  return execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], { timeout: TIMEOUT_MS }).toString().trim().split("\n")
    .map(t => t.split(" ").map(Number));
}

function readStripHits(strips: readonly DesktopRect[]): readonly string[] {
  const script = `ObjC.import("AppKit"); ObjC.import("CoreGraphics");
const strips = ${JSON.stringify(strips.map(t => [t.x, t.y, t.width, t.height]))};
const shown = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(1, 0)));
const mainHeight = $.NSScreen.screens.objectAtIndex(0).frame.size.height;
strips.map(([x, y, width, height]) => {
  const own = shown.filter(t => t.kCGWindowBounds.X === x && t.kCGWindowBounds.Y === y && t.kCGWindowBounds.Width === width
    && t.kCGWindowBounds.Height === height).map(t => t.kCGWindowNumber);
  const hit = Number($.NSWindow.windowNumberAtPointBelowWindowWithWindowNumber({ x: x + width / 2, y: mainHeight - y - height / 2 }, 0));
  return \`\${own.length} shown, \${own.includes(hit) ? "clicked" : "clicked through"}\`;
}).join("\\n");`;
  return execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], { timeout: TIMEOUT_MS }).toString().trim().split("\n");
}

describe("the macOS backend on the desktop", { skip: process.platform !== "darwin" ? "The macOS backend runs on macOS only." : false }, () => {
  const starter = new ProgramStarterDouble();
  const backend = MacBackend.load(starter);
  let window: MacTestWindow;
  let windowId = "";
  let secureField = new DesktopPoint(0, 0);
  let previousTest = "none, the suite's start";
  let running: Pick<TestContext, "diagnostic"> | undefined;

  async function frontAsync(): Promise<WindowInfo> {
    for (const end = Date.now() + TIMEOUT_MS; ; await delay(FRONT_POLL_MS)) {
      const front = await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS));
      if (front !== null && front.target.processId === window.pid && front.target.windowId === windowId)
        return front;
      const described = await MacTestWindow.describeFrontAsync(TIMEOUT_MS);
      if (Date.now() >= end) {
        assert.ok(front !== null, `No window was in front within ${TIMEOUT_MS} ms; in front: ${described}.`);
        assert.equal(front.target.processId, window.pid, `The window in front belongs to ${front.appName}, not to the test window; in front: ${described}.`);
        assert.fail(`The window in front is window ${front.target.windowId} of the test's process, not the test window ${windowId}; in front: ${described}.`);
      }
      const read = front === null ? "no window" : `window ${front.target.windowId} of ${front.appName}, process ${front.target.processId}`;
      running?.diagnostic(`The backend read ${read} in front, not the test window, so it reads again; in front: ${described}.`);
    }
  }

  async function waitFrontProcessAsync(processId: number, which: string): Promise<void> {
    for (const end = Date.now() + TIMEOUT_MS; ; await delay(FRONT_POLL_MS)) {
      const front = Number(execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", FRONT_PROCESS], { timeout: TIMEOUT_MS }).toString().trim());
      if (front === processId)
        return;
      if (Date.now() >= end)
        assert.fail(`${which} didn't take the front within ${TIMEOUT_MS} ms; process ${front} has it.`);
    }
  }

  async function captureTestWindowAsync(): Promise<{ readonly stack: WindowStack; readonly listed: StackedWindow; readonly image: WindowImage }> {
    const stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
    const listed = stack.windows.find(t => t.windowId === windowId);
    assert.ok(listed !== undefined, `The test window ${windowId} isn't among the ${stack.windows.length} windows listed.`);
    const image = await backend.capture.captureWindowAsync(listed, AbortSignal.timeout(TIMEOUT_MS));
    assert.ok(image !== null, `The test window at ${JSON.stringify(listed.frame)} couldn't be captured.`);

    return { stack, listed, image };
  }

  function scan(image: WindowImage, isColour: (red: number, green: number, blue: number) => boolean): { readonly found: readonly { readonly x: number; readonly y: number }[]; readonly common: string } {
    const found: { x: number; y: number }[] = [];
    const colours = new Map<string, number>();
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++) {
        const at = (y * image.width + x) * 4;
        const [blue = 0, green = 0, red = 0] = image.bgra.subarray(at, at + 3);
        colours.set(`${red},${green},${blue}`, (colours.get(`${red},${green},${blue}`) ?? 0) + 1);
        if (isColour(red, green, blue))
          found.push({ x, y });
      }

    return { found, common: [...colours].sort((a, b) => b[1] - a[1]).slice(0, 5).map(t => `${t[0]} ×${t[1]}`).join("; ") };
  }

  function keep(image: WindowImage, name: string): void {
    const rgb = Buffer.alloc(image.width * image.height * 3);
    for (let pixel = 0; pixel < image.width * image.height; pixel++)
      rgb.set([image.bgra[pixel * 4 + 2] ?? 0, image.bgra[pixel * 4 + 1] ?? 0, image.bgra[pixel * 4] ?? 0], pixel * 3);
    const folder = path.join(process.cwd(), "_build", "native-captures");
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, name), Buffer.concat([Buffer.from(`P6 ${image.width} ${image.height} 255\n`), rgb]));
  }

  function scanShot(image: PngImage, rect: DesktopRect, isColour: (red: number, green: number, blue: number) => boolean): readonly { readonly x: number; readonly y: number }[] {
    const found: { x: number; y: number }[] = [];
    for (let y = Math.max(0, rect.y); y < Math.min(image.height, rect.y + rect.height); y++)
      for (let x = Math.max(0, rect.x); x < Math.min(image.width, rect.x + rect.width); x++) {
        const [red = 0, green = 0, blue = 0] = image.pixel(x, y);
        if (isColour(red, green, blue))
          found.push({ x, y });
      }

    return found;
  }

  function readShot(result: ToolResult): { readonly image: PngImage; readonly text: unknown } {
    const [image, text] = result.content;
    assert.ok(image?.kind === ToolContentKind.Image && text?.kind === ToolContentKind.Text, `The tool answered ${result.content.map(t => t.kind).join(", ")}.`);

    return { image: PngImage.read(Buffer.from(image.value, "base64")), text: JSON.parse(text.value) };
  }

  async function findMarkerAsync(front: WindowInfo): Promise<DesktopPoint> {
    const { listed, image } = await captureTestWindowAsync();
    const { found, common } = scan(image, isMarker);
    if (found.length === 0)
      keep(image, "mac-test-window.ppm");
    const frame = listed.frame;
    assert.ok(found.length > 0, `The test window's image of ${image.width} by ${image.height} pixels over ${JSON.stringify(frame)} shows no marker; its commonest colours are ${common}, and ${await describeCoverAsync(front)}.`);
    const centre = found[Math.floor(found.length / 2)] ?? { x: 0, y: 0 };

    return new DesktopPoint(frame.x + Math.floor((centre.x + 0.5) * frame.width / image.width), frame.y + Math.floor((centre.y + 0.5) * frame.height / image.height));
  }

  async function describeCoverAsync(front: WindowInfo): Promise<string> {
    const stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
    const at = stack.windows.findIndex(t => t.app?.id === front.app.id);
    const f = front.frame;
    const cover = stack.windows.slice(0, Math.max(0, at)).filter(t => t.frame.x < f.x + f.width && f.x < t.frame.x + t.frame.width && t.frame.y < f.y + f.height && f.y < t.frame.y + t.frame.height);

    return `the windows in front of it over it are ${JSON.stringify(cover.map(t => ({ app: t.app?.id ?? null, frame: t.frame })))}, of ${stack.windows.length} listed, complete ${stack.isComplete}`;
  }

  async function refusalOfAsync(action: Promise<void>): Promise<RefusalException> {
    try {
      await action;
    } catch (error) {
      assert.ok(error instanceof RefusalException, `The action failed with ${String(error)}, not a refusal.`);
      return error;
    }
    assert.fail("The action was sent, not refused.");
  }

  async function farFromAsync(point: DesktopPoint): Promise<DesktopPoint> {
    const display = (await backend.displays.listDisplaysAsync(AbortSignal.timeout(TIMEOUT_MS))).find(t => t.isPrimary);
    assert.ok(display !== undefined, "No primary display is listed.");
    const isRightFree = point.x + FAR_GLIDE < display.x + display.width - EDGE;

    return new DesktopPoint(isRightFree ? point.x + FAR_GLIDE : point.x - FAR_GLIDE, point.y);
  }

  before(async () => {
    const probe = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
    const missing = readGrants(await probe.callAsync("checkGrants", {}));
    await probe.closeAsync();
    assert.deepEqual(missing, [], `The process that started the tests lacks ${missing.join(" and ")}; the grants go to the process macOS holds responsible for it.`);

    window = await MacTestWindow.openAsync();
    await window.takeLineAsync("ready ", TIMEOUT_MS);
    windowId = String(window.windowNumber);
    secureField = new DesktopPoint(window.secureField.x, window.secureField.y);
  });

  after(async () => {
    try {
      await window?.closeAsync(TIMEOUT_MS);
    } finally {
      await backend.closeAsync();
      await starter.endAsync();
    }
  });

  beforeEach(async t => {
    running = t;
    const isInFrontAsync = async (): Promise<boolean> => await MacTestWindow.readFrontProcessAsync(TIMEOUT_MS) === window.pid;
    if (await isInFrontAsync())
      return;
    assert.ok("diagnostic" in t, "The hook got no test's context.");
    t.diagnostic(`The test window wasn't in front after the test "${previousTest}", so it was brought back; in front: ${await MacTestWindow.describeFrontAsync(TIMEOUT_MS)}.`);
    await window.bringToFrontAsync(TIMEOUT_MS);
    for (const end = Date.now() + TIMEOUT_MS; !(await isInFrontAsync()); await delay(POLL_MS))
      if (Date.now() >= end)
        assert.fail(`The test window didn't come back to the front within ${TIMEOUT_MS} ms; in front: ${await MacTestWindow.describeFrontAsync(TIMEOUT_MS)}.`);
  });

  afterEach(async t => {
    previousTest = t.name;
    assert.ok("passed" in t, "The hook got no test's result.");
    if (t.passed)
      return;
    const untaken = await window.takeUntilSentinelAsync(TIMEOUT_MS).then(lines => lines, (error: unknown) => [`the sentinel failed: ${String(error)}`]);
    const left = [...untaken, ...window.takePending()];
    if (left.length > 0)
      t.diagnostic(`The test left the test window's lines ${JSON.stringify(left)}; they were taken, so the next test doesn't read them.`);
  });

  it("reads the test window in front, by the applet's bundle identifier", async () => {
    const front = await frontAsync();

    assert.equal(front.app.id, window.bundleId);
    assert.equal(front.appName, "NoldovaTestWindow");
    assert.equal(front.isElevated, false);
    assert.ok(front.frame.width >= 640 && front.frame.height >= 400);
  });

  it("reads a second test window's app in front once it takes the front, and the test window's again once it's brought back", async () => {
    await frontAsync();
    const other = await MacTestWindow.openAsync();
    try {
      await other.takeLineAsync("ready ", TIMEOUT_MS);
      await waitFrontProcessAsync(other.pid, "The second test window's app");

      assert.equal((await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS)))?.target.processId, other.pid, "The input process doesn't read the second window's app in front.");
    } finally {
      await other.closeAsync(TIMEOUT_MS);
    }
    await window.bringToFrontAsync(TIMEOUT_MS);

    const back = await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS));
    assert.deepEqual([back?.target.processId, back?.target.windowId], [window.pid, windowId], "The input process doesn't read the test window in front again.");
  });

  it("lists the test window among the windows that may show, with its app and frame", async () => {
    const front = await frontAsync();

    const stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
    const listed = stack.windows.filter(t => t.app?.id === front.app.id);

    assert.equal(stack.isComplete, true);
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0]?.frame, front.frame);
  });

  it("shows the border in its colour along each display, out of the window list, letting a click through, leaving the test window in front", async () => {
    await frontAsync();
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    const displays = await backend.displays.listDisplaysAsync(signal);
    const frames = displays.map(t => BorderFrame.of(t, backend.border.unitsPerPixel(t)));
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "noldova-computer-use-border-"));
    try {
      await backend.border.showAsync(frames, "#005FB8", signal);
      await backend.border.showAsync(frames, "#005FB8", signal);

      const { windows } = await backend.windows.listStackAsync(signal);
      const strips = frames.map(t => new DesktopRect(t.bounds.x, t.bounds.y, t.bounds.width, t.thickness));
      assert.deepEqual(windows.filter(t => strips.some(strip => t.frame.x === strip.x && t.frame.y === strip.y && t.frame.width === strip.width && t.frame.height === strip.height)), []);
      assert.deepEqual(readStripHits(strips), strips.map(() => "1 shown, clicked through"));
      const colors = readDisplayColors(strips);
      for (const [index, strip] of strips.entries()) {
        const file = path.join(folder, `strip-${index}.png`);
        execFileSync("/usr/sbin/screencapture", ["-x", "-t", "png", `-R${strip.x + Math.floor(strip.width / 2)},${strip.y},1,${strip.height}`, file], { timeout: TIMEOUT_MS });
        const [red = 0, green = 0, blue = 0] = PngImage.readSystem(fs.readFileSync(file)).rows()[0]?.[0] ?? [];
        const [shownRed = 0, shownGreen = 0, shownBlue = 0] = colors[index] ?? [];
        assert.ok(Math.abs(red - shownRed) <= COLOR_SLACK && Math.abs(green - shownGreen) <= COLOR_SLACK && Math.abs(blue - shownBlue) <= COLOR_SLACK,
          `The border's strip at ${JSON.stringify(strip)} shows ${red}, ${green}, ${blue}, not #005FB8, which its display shows as ${shownRed}, ${shownGreen}, ${shownBlue}.`);
      }
      await frontAsync();
    } finally {
      await backend.border.hideAsync(AbortSignal.timeout(TIMEOUT_MS));
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  it("describes an app by its bundle's name and signer, with its icon as a PNG 64 pixels a side whose clear pixels keep their alpha", async () => {
    const app = await backend.apps.describeAppAsync(AppIdentity.ofMacBundleId("com.apple.finder"), 64, AbortSignal.timeout(TIMEOUT_MS));

    assert.ok(app !== null, "Finder wasn't described.");
    assert.equal(app.name, "Finder");
    assert.equal(app.publisher, "Apple");
    assert.ok(app.icon !== null, "Finder's icon wasn't read.");
    const icon = PngImage.readSystem(app.icon);
    assert.deepEqual([icon.width, icon.height, icon.channels], [64, 64, 4]);
    const alphas = icon.rows().flat().map(t => t[3] ?? Number.NaN);
    assert.ok(alphas.includes(0) && alphas.includes(255), `The icon's alphas run from ${Math.min(...alphas)} to ${Math.max(...alphas)}, not from clear to solid.`);
    assert.equal(await backend.apps.describeAppAsync(AppIdentity.ofMacBundleId("com.example.absent"), 64, AbortSignal.timeout(TIMEOUT_MS)), null);
  });

  it("describes an app whose bundle identifier has capitals by its lowercase identity", async () => {
    const identity = AppIdentity.ofMacBundleId("com.apple.TextEdit");

    const app = await backend.apps.describeAppAsync(identity, 64, AbortSignal.timeout(TIMEOUT_MS));

    assert.equal(identity.id, "com.apple.textedit");
    assert.deepEqual([app?.name, app?.publisher], ["TextEdit", "Apple"]);
  });

  it("lists the test app among the running apps", async () => {
    const apps = await backend.apps.listAppsAsync(AbortSignal.timeout(TIMEOUT_MS));

    assert.equal(apps.filter(t => t.identity.id === window.bundleId && t.isRunning).length, 1);
  });

  it("lists an app that starts after the input process listed the apps among the running apps, and no longer once it ends", async () => {
    async function waitListedAsync(isRunning: boolean): Promise<void> {
      for (const end = Date.now() + TIMEOUT_MS; ; await delay(FRONT_POLL_MS)) {
        const apps = await backend.apps.listAppsAsync(AbortSignal.timeout(TIMEOUT_MS));
        if (apps.some(t => t.identity.id === SECOND_BUNDLE.toLowerCase() && t.isRunning) === isRunning)
          return;
        if (Date.now() >= end)
          assert.fail(`The input process ${isRunning ? "doesn't list the second app running once it starts" : "still lists the second app running once it ends"}, after ${TIMEOUT_MS} ms.`);
      }
    }
    await frontAsync();
    await waitListedAsync(false);
    const other = await MacTestWindow.openAsync(SECOND_BUNDLE);
    try {
      await other.takeLineAsync("ready ", TIMEOUT_MS);

      await waitListedAsync(true);
    } finally {
      await other.closeAsync(TIMEOUT_MS);
    }
    await waitListedAsync(false);
    await window.bringToFrontAsync(TIMEOUT_MS);
  });

  it("captures the test window's own pixels under another process's window over its marker, with none of that window's colour", async t => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);
    const markerPixels = scan((await captureTestWindowAsync()).image, isMarker).found.length;
    const cover = MacCoverWindow.open(point.x - COVER_SIDE / 2, point.y - COVER_SIDE / 2, COVER_SIDE, COVER_SIDE);
    try {
      const coverId = await cover.readyAsync(TIMEOUT_MS);
      let windows: readonly StackedWindow[] = [];
      let coverAt = -1;
      let testAt = -1;
      for (const deadline = Date.now() + TIMEOUT_MS; !(coverAt !== -1 && coverAt < testAt) && Date.now() < deadline; await delay(100)) {
        windows = (await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS))).windows;
        coverAt = windows.findIndex(u => u.windowId === coverId);
        testAt = windows.findIndex(u => u.windowId === windowId);
      }
      const frame = windows[coverAt]?.frame;
      assert.ok(frame !== undefined && coverAt < testAt, `The cover window ${coverId} isn't listed in front of the test window; it is at ${coverAt}, the test window at ${testAt}.`);
      assert.ok(frame.x <= point.x && point.x < frame.x + frame.width && frame.y <= point.y && point.y < frame.y + frame.height, `The cover window at ${JSON.stringify(frame)} doesn't lie over the marker at ${point.x}, ${point.y}.`);
      await frontAsync();

      const { image } = await captureTestWindowAsync();
      const limes = scan(image, isLime);
      const markers = scan(image, isMarker);
      if (limes.found.length > 0 || markers.found.length !== markerPixels)
        keep(image, "mac-test-window-covered.ppm");

      assert.equal(limes.found.length, 0, `The test window's image shows ${limes.found.length} pixels of the cover window's colour; its commonest colours are ${limes.common}.`);
      assert.equal(markers.found.length, markerPixels, `The test window's image shows ${markers.found.length} of the marker's ${markerPixels} pixels under the cover window; its commonest colours are ${markers.common}.`);

      const { listed } = await captureTestWindowAsync();
      const times: number[] = [];
      for (let take = 0; take < CAPTURE_TIMES; take++) {
        const start = performance.now();
        await backend.capture.captureWindowAsync(listed, AbortSignal.timeout(TIMEOUT_MS));
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      t.diagnostic(`capturing the ${listed.frame.width} by ${listed.frame.height} test window took ${times.map(u => u.toFixed(1)).join(", ")} ms`);
    } finally {
      await cover.closeAsync(TIMEOUT_MS);
    }
  });

  it("masks a screenshot and zooms into it at the display's scale, the marker at its own pixels and the cover window covered", async t => {
    const front = await frontAsync();
    const { listed, image: own } = await captureTestWindowAsync();
    const ownMarkers = scan(own, isMarker).found;
    assert.ok(ownMarkers.length > 0, "The test window's image shows no marker.");
    const display = (await backend.displays.listDisplaysAsync(AbortSignal.timeout(TIMEOUT_MS))).find(u => u.isPrimary);
    assert.ok(display !== undefined, "No primary display is listed.");
    const scale = display.scaleFactor;
    if (scale < 2) {
      t.skip(`the display is at scale ${scale}; the case checks the mapping at scale 2`);
      return;
    }
    const xs = ownMarkers.map(u => u.x);
    const ys = ownMarkers.map(u => u.y);
    const centre = new DesktopPoint(Math.round(listed.frame.x + (Math.min(...xs) + Math.max(...xs) + 1) / 2 / scale), Math.round(listed.frame.y + (Math.min(...ys) + Math.max(...ys) + 1) / 2 / scale));
    const cover = MacCoverWindow.open(centre.x, centre.y - COVER_SIDE / 2, COVER_SIDE, COVER_SIDE);
    const center = new RecordingPermissionCenter();
    const answerer = center.appAnswerer;
    const context = new RuntimePartContextDouble(center, starter);
    const part = new RuntimePart(() => backend);
    await part.activateAsync(context);
    const session = context.tools.openSessionAs("session-1", "conversation-1");
    const callAsync = async (name: string, input: JsonObject): Promise<ToolResult> => {
      const outcome = await session.callAsync(name, input, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (outcome.isFailure)
        throw new ToolFailureException(outcome);

      return outcome;
    };
    try {
      const coverId = await cover.readyAsync(TIMEOUT_MS);
      let isCoverInFront = false;
      for (const deadline = Date.now() + TIMEOUT_MS; !isCoverInFront && Date.now() < deadline; await delay(100)) {
        const windows = (await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS))).windows;
        const coverAt = windows.findIndex(u => u.windowId === coverId);
        isCoverInFront = coverAt !== -1 && coverAt < windows.findIndex(u => u.windowId === windowId);
      }
      assert.ok(isCoverInFront, `The cover window ${coverId} isn't listed in front of the test window.`);
      await frontAsync();
      const request = callAsync("computer_request_apps", { apps: [front.app.id], reason: "To check the screenshot at the display's scale." });
      let pending = await answerer.nextAsync();
      if (pending.request.action === "computer-use.controlScreen") {
        answerer.answer(pending.id, PermissionOption.AllowOnce);
        pending = await answerer.nextAsync();
      }
      assert.equal(pending.request.action, "computer-use.controlApp");
      answerer.answer(pending.id, PermissionOption.AllowAlways);
      await request;

      const shot = readShot(await callAsync("computer_screenshot", {}));
      const k = shot.image.width / display.width;
      const toShot = (x: number, y: number, width: number, height: number): DesktopRect =>
        new DesktopRect(Math.round((x - display.x) * k), Math.round((y - display.y) * k), Math.round(width * k), Math.round(height * k));
      const windowRect = toShot(listed.frame.x, listed.frame.y, listed.frame.width, listed.frame.height);
      const coverRect = toShot(centre.x, centre.y - COVER_SIDE / 2, COVER_SIDE, COVER_SIDE);
      const markers = scanShot(shot.image, windowRect, isMarker);
      const limes = scanShot(shot.image, coverRect, isLime);
      const ownLeft = ownMarkers.filter(u => listed.frame.x + u.x / scale < centre.x).length;
      const expectedLeft = (listed.frame.x - display.x + Math.min(...xs) / scale) * k;
      const expectedTop = (listed.frame.y - display.y + Math.min(...ys) / scale) * k;
      t.diagnostic(`the ${display.width} by ${display.height} display at scale ${scale} gave a ${shot.image.width} by ${shot.image.height} screenshot, ${JSON.stringify(shot.text)}; the test window's own image is ${own.width} by ${own.height}; the marker's corner is at ${Math.min(...markers.map(u => u.x))}, ${Math.min(...markers.map(u => u.y))} in the screenshot, expected at ${expectedLeft.toFixed(1)}, ${expectedTop.toFixed(1)}`);

      assert.equal(own.width, Math.round(listed.frame.width * scale), "The test window's image isn't at the display's scale.");
      assert.equal(limes.length, 0, `The screenshot shows ${limes.length} pixels of the cover window's colour.`);
      const [coverRed = 0, coverGreen = 0, coverBlue = 0] = shot.image.pixel(coverRect.x + Math.floor(coverRect.width / 2), coverRect.y + Math.floor(coverRect.height / 2));
      assert.ok(isFill(coverRed, coverGreen, coverBlue), "The screenshot doesn't cover the cover window.");
      assert.ok(markers.length > 0, "The screenshot shows no marker.");
      assert.ok(Math.abs(Math.min(...markers.map(u => u.x)) - expectedLeft) <= 2, "The marker's left edge isn't where the display's scale puts it in the screenshot.");
      assert.ok(Math.abs(Math.min(...markers.map(u => u.y)) - expectedTop) <= 2, "The marker's top edge isn't where the display's scale puts it in the screenshot.");
      assert.ok(Math.max(...markers.map(u => u.x)) <= coverRect.x, "The screenshot shows the marker under the cover window.");

      const left = Math.min(...markers.map(u => u.x));
      const top = Math.min(...markers.map(u => u.y));
      const right = Math.max(...markers.map(u => u.x)) + 1;
      const bottom = Math.max(...markers.map(u => u.y)) + 1;
      const zoom = readShot(await callAsync("computer_zoom", { region: [left, top, right, bottom] }));
      const whole = new DesktopRect(0, 0, zoom.image.width, zoom.image.height);
      const zoomed = scanShot(zoom.image, whole, isMarker);
      const expectedWidth = (Math.ceil(right * display.width / shot.image.width) - Math.floor(left * display.width / shot.image.width)) * scale;
      t.diagnostic(`the zoom of [${left}, ${top}, ${right}, ${bottom}] gave a ${zoom.image.width} by ${zoom.image.height} image, expected ${expectedWidth} wide, with ${zoomed.length} marker pixels of the ${ownLeft} the cover leaves`);

      assert.equal(zoom.image.width, expectedWidth, "The zoom isn't at the capture's own pixels.");
      assert.equal(scanShot(zoom.image, whole, isLime).length, 0, "The zoom shows the cover window's colour.");
      assert.ok(zoomed.length > 0.8 * ownLeft && zoomed.length <= ownLeft, `The zoom shows ${zoomed.length} marker pixels, not the ${ownLeft} the cover leaves.`);
    } finally {
      await part.deactivateAsync();
      await cover.closeAsync(TIMEOUT_MS);
    }
  });

  it("captures the marker, clicks it, the window reports the click on it, and the pointer reads where the click left it", async () => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);

    assert.ok(isInside(front.frame, point), "The marker lies too near the test window's edge.");
    await backend.input.clickAsync((await frontAsync()).target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));

    const [, x, y, count] = (await window.takeLineAsync("click ", TIMEOUT_MS)).split(" ").map(Number);
    assert.ok(x !== undefined && x >= 0 && x < MARKER_SIZE && y !== undefined && y >= 0 && y < MARKER_SIZE, `The click landed at ${x}, ${y} of the marker.`);
    assert.equal(count, 1);
    assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), point);
  });

  it("double-clicks the marker, and the window reports a click count of two", async () => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);

    await backend.input.clickAsync((await frontAsync()).target, point, PointerButton.Left, ClickCount.Double, [], AbortSignal.timeout(TIMEOUT_MS));

    await window.takeLineAsync("click ", TIMEOUT_MS);
    assert.equal(Number((await window.takeLineAsync("click ", TIMEOUT_MS)).split(" ")[3]), 2);
  });

  it("drags from the marker with Shift held, and the window reports the drag", async () => {
    const front = await frontAsync();
    const from = await findMarkerAsync(front);
    const to = new DesktopPoint(from.x + 60, from.y + 40);

    assert.ok(isInside(front.frame, from) && isInside(front.frame, to), "The drag reaches too near the test window's edge.");
    await backend.input.dragAsync((await frontAsync()).target, from, to, PointerButton.Left, [ModifierKey.Shift], AbortSignal.timeout(TIMEOUT_MS));

    const [, dx, dy, ...modifiers] = (await window.takeLineAsync("drag ", TIMEOUT_MS)).split(" ");
    assert.ok(Math.abs(Number(dx) - 60) <= 1 && Math.abs(Number(dy) - 40) <= 1, `The drag moved ${dx}, ${dy}.`);
    assert.equal(modifiers.join(" "), "Shift");
  });

  it("stops a drag whose end leaves the test window after the press, releasing the button where the pointer is", async () => {
    const front = await frontAsync();
    const from = await findMarkerAsync(front);
    const to = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);

    const target = (await frontAsync()).target;
    assert.ok(isInside(front.frame, from) && isInside(front.frame, to), "The drag reaches too near the test window's edge.");
    await backend.input.movePointerAsync(target, from, AbortSignal.timeout(TIMEOUT_MS));
    window.send(`move-on-press ${MOVE_AWAY} 0`);
    await window.takeLineAsync("armed", TIMEOUT_MS);
    let error: unknown = null;
    try {
      await backend.input.dragAsync(target, from, to, PointerButton.Left, [], AbortSignal.timeout(TIMEOUT_MS));
    } catch (reason: unknown) {
      error = reason;
    }
    try {
      await window.takeLineAsync("moved ", TIMEOUT_MS);
      const pointer = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));

      assert.ok(error instanceof RefusalException, `The drag wasn't refused: ${String(error)}`);
      assert.equal(error.isInputSent, true);
      assert.ok(Math.hypot(pointer.x - to.x, pointer.y - to.y) > EDGE, `The pointer reached the drag's end, ${pointer.x}, ${pointer.y}.`);
      assert.equal(execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", LEFT_BUTTON], { timeout: TIMEOUT_MS }).toString().trim(), "false");
      await window.takeLineAsync("drag ", TIMEOUT_MS);
    } finally {
      window.send(`move ${-MOVE_AWAY} 0`);
      assert.equal(await window.takeLineAsync("moved ", TIMEOUT_MS), `moved ${-MOVE_AWAY} 0`);
    }
  });

  it("releases a drag stopped after its press where the pointer is, dropping nothing at its end", async () => {
    const front = await frontAsync();
    const from = await findMarkerAsync(front);
    const to = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
    await backend.input.movePointerAsync(front.target, from, AbortSignal.timeout(TIMEOUT_MS));
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "noldova-computer-use-stop-"));
    const stopPath = path.join(folder, "stop");
    const input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
    const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
    let outcome: unknown = null;
    let recorder: MacPointerRecorder | null = null;
    try {
      recorder = await MacPointerRecorder.startAsync(from, RECORD_MS, TIMEOUT_MS, stopPath);
      outcome = await input.callAsync("drag", { target, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, steps: GlideRecording.slowSteps(from, to), button: "Left", modifiers: [], stopPath });
      await recorder.samplesAsync();
    } finally {
      await recorder?.endAsync();
      await input.closeAsync();
      fs.rmSync(folder, { recursive: true, force: true });
    }

    const pointer = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
    const [, dx, dy] = (await window.takeLineAsync("drag ", TIMEOUT_MS)).split(" ");
    assert.deepEqual(outcome, { status: "stopped", inputSent: true });
    assert.ok(Math.hypot(pointer.x - to.x, pointer.y - to.y) > EDGE, `The pointer reached the drag's end, ${pointer.x}, ${pointer.y}.`);
    assert.ok(
      Math.abs(Number(dx) - (pointer.x - from.x)) <= 1 && Math.abs(Number(dy) - (pointer.y - from.y)) <= 1,
      `The drag moved ${dx}, ${dy}, with the pointer at ${pointer.x}, ${pointer.y} from ${from.x}, ${from.y}.`
    );
    assert.equal(execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", LEFT_BUTTON], { timeout: TIMEOUT_MS }).toString().trim(), "false");
  });

  it("answers a drag whose stop file is there before its press as stopped with nothing sent, and refuses a drag with no stop file's path", async () => {
    const front = await frontAsync();
    const from = await findMarkerAsync(front);
    const to = new DesktopPoint(from.x + 60, from.y + 40);
    await backend.input.movePointerAsync(front.target, from, AbortSignal.timeout(TIMEOUT_MS));
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "noldova-computer-use-stop-"));
    const stopPath = path.join(folder, "stop");
    fs.writeFileSync(stopPath, "", { mode: 0o600 });
    const input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
    const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
    const drag = { target, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, steps: [{ x: to.x, y: to.y, atMs: 0 }], button: "Left", modifiers: [] };
    try {
      assert.deepEqual(await input.callAsync("drag", { ...drag, stopPath }), { status: "stopped", inputSent: false });
      await assert.rejects(input.callAsync("drag", { ...drag, stopPath: "" }), /stop file isn't a path/);
    } finally {
      await input.closeAsync();
      fs.rmSync(folder, { recursive: true, force: true });
    }

    assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), from);
    assert.equal(execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", LEFT_BUTTON], { timeout: TIMEOUT_MS }).toString().trim(), "false");
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("drag ") || t.startsWith("click ")), []);
  });

  it("refuses a glide to a point the test window has moved away from, leaving the pointer where it was and sending no click", async () => {
    const point = await findMarkerAsync(await frontAsync());
    let clicked: unknown = null;
    let pointer: DesktopPoint | null = null;
    let start = point;
    window.send(`move ${MOVE_AWAY} 0`);
    try {
      assert.equal(await window.takeLineAsync("moved ", TIMEOUT_MS), `moved ${MOVE_AWAY} 0`);
      const front = await frontAsync();
      assert.ok(point.x < front.frame.x, `The test window at ${JSON.stringify(front.frame)} still holds ${point.x}, ${point.y} after its move.`);
      start = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
      assert.ok(isInside(front.frame, start), "The glide's start lies too near the test window's edge.");
      await MacTestWindow.warpAsync(start, TIMEOUT_MS);

      clicked = await backend.input.clickAsync(front.target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)).then(() => null, (error: unknown) => error);
      pointer = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
    } finally {
      window.send(`move ${-MOVE_AWAY} 0`);
      assert.equal(await window.takeLineAsync("moved ", TIMEOUT_MS), `moved ${-MOVE_AWAY} 0`);
      await MacTestWindow.warpAsync(point, TIMEOUT_MS);
    }

    assert.deepEqual(clicked instanceof RefusalException ? [clicked.reason, clicked.isInputSent] : clicked, [RefusalReason.OtherWindowAtPoint, false]);
    assert.deepEqual(pointer, start);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("click ")), []);
  });

  for (const request of MALFORMED_REQUESTS)
    it(`refuses ${request.name} sent straight to the input process with the field's failure, sending nothing`, async () => {
      const front = await frontAsync();
      const point = await findMarkerAsync(front);
      const pointer = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
      const input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
      const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
      let failure: unknown = null;
      try {
        failure = await failureOfAsync(input, request.method, request.parametersAt(target, point));
      } finally {
        await input.closeAsync();
      }

      assert.ok(failure instanceof MacScriptFailedException, `The input process answered ${JSON.stringify(failure)}.`);
      assert.equal(failure.method, request.method);
      assert.equal(failure.scriptMessage, request.scriptMessage);
      assert.equal(failure.message, `The macOS input process failed ${request.method}: ${request.scriptMessage}`);
      assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), pointer);
      assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("click ") || t.startsWith("scroll ")), []);
    });

  it("refuses a click while the person is watched for once the pointer was put elsewhere, sending no click", async () => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);
    const start = await farFromAsync(point);

    await MacTestWindow.warpAsync(start, TIMEOUT_MS);
    await backend.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
    try {
      await MacTestWindow.warpAsync(new DesktopPoint(start.x, start.y - ASIDE), TIMEOUT_MS);
      const refusal = await refusalOfAsync(backend.input.clickAsync((await frontAsync()).target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)));

      assert.equal(refusal.reason, RefusalReason.PhysicalInput);
      assert.equal(refusal.isInputSent, false);
    } finally {
      await backend.physicalInput.stopAsync();
    }
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("click ")), []);
  });

  async function handMovedAsync(hand: MacHand): Promise<void> {
    await hand.armAsync(0, 0, TIMEOUT_MS);
    const counted = await hand.countedAsync(TIMEOUT_MS);
    assert.equal(counted.events, 1, `The test's case didn't happen: the window server counted ${counted.events} pointer events, not the hand's one move; the hand ${counted.times}.`);
  }

  async function glideAfterHandAsync(from: DesktopPoint, to: DesktopPoint, handTo: DesktopPoint): Promise<{ readonly outcome: unknown; readonly pointer: DesktopPoint }> {
    const front = await frontAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
    const middle = new DesktopPoint(Math.round((from.x + to.x) / 2), Math.round((from.y + to.y) / 2));
    const steps = [{ atMs: 0, x: middle.x, y: middle.y }, { atMs: SECOND_STEP_MS, x: to.x, y: to.y }];
    const input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
    let hand: MacHand | undefined;

    await MacTestWindow.warpAsync(from, TIMEOUT_MS);
    try {
      hand = await MacHand.startCountedAsync(handTo, TIMEOUT_MS);
      await input.callAsync("startWatch", {});
      await handMovedAsync(hand);
      const outcome = await input.callAsync("glidePointer", { target, points: [{ x: to.x, y: to.y }], steps });

      return { outcome, pointer: await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)) };
    } finally {
      await hand?.endAsync();
      await input.closeAsync();
    }
  }

  it("stops a glide at its first step once the person's pointer has moved off where the watch left it, sending nothing", async () => {
    const point = await findMarkerAsync(await frontAsync());
    const from = new DesktopPoint(point.x + TWO_STEPS, point.y);
    const handTo = new DesktopPoint(from.x, from.y - ASIDE);

    const { outcome, pointer } = await glideAfterHandAsync(from, point, handTo);

    assert.deepEqual(outcome, { status: "refused", reason: "PhysicalInput", inputSent: false });
    assert.deepEqual(pointer, handTo);
  });

  it("stops a glide at its first step once the person has moved the pointer by as little as only the window server's count shows, sending nothing", async () => {
    const point = await findMarkerAsync(await frontAsync());
    const from = new DesktopPoint(point.x + TWO_STEPS, point.y);
    const handTo = new DesktopPoint(from.x + HAND_ASIDE, from.y);

    const { outcome, pointer } = await glideAfterHandAsync(from, point, handTo);

    assert.deepEqual(outcome, { status: "refused", reason: "PhysicalInput", inputSent: false });
    assert.deepEqual(pointer, handTo);
  });

  it("refuses a click at the pointer after a move of the person's that only the window server's count shows, by the click's own check, sending no click", async () => {
    const point = await findMarkerAsync(await frontAsync());
    const aside = new DesktopPoint(point.x + HAND_ASIDE, point.y);
    const fresh = MacBackend.load(starter);
    let hand: MacHand | undefined;
    let refusal: unknown = null;

    await MacTestWindow.warpAsync(point, TIMEOUT_MS);
    try {
      hand = await MacHand.startCountedAsync(aside, TIMEOUT_MS);
      await fresh.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
      const target = (await frontAsync()).target;
      await handMovedAsync(hand);
      assert.deepEqual(await fresh.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), aside);
      refusal = await fresh.input.clickAsync(target, aside, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)).then(() => null, (error: unknown) => error);
    } finally {
      await hand?.endAsync();
      await fresh.physicalInput.stopAsync();
      await fresh.closeAsync();
    }

    assert.deepEqual(refusal instanceof RefusalException ? [refusal.reason, refusal.isInputSent] : refusal, [RefusalReason.PhysicalInput, false]);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("click ")), []);
  });

  it("scrolls over the marker, and the window reports a vertical scroll", async () => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);

    await backend.input.scrollAsync((await frontAsync()).target, point, new ScrollAmount(0, 3), [], AbortSignal.timeout(TIMEOUT_MS));

    const [, dx, dy] = (await window.takeLineAsync("scroll ", TIMEOUT_MS)).split(" ").map(Number);
    assert.equal(dx, 0);
    assert.notEqual(dy, 0);
  });

  async function readSaveAsync(front: WindowInfo): Promise<ControlInfo> {
    const tree = await backend.controls.readControlsAsync(front.target, null, AbortSignal.timeout(TIMEOUT_MS));
    const save = tree.controls.find(t => t.role === ControlRole.Button && t.name === "Save");
    assert.ok(save !== undefined, `The read lists no Save button among ${tree.controls.map(t => `${t.role} "${t.name}"`).join("; ")}.`);

    return save;
  }

  async function focusTextFieldAsync(): Promise<void> {
    const front = await frontAsync();
    await backend.input.clickAsync(front.target, await findMarkerAsync(front), PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));
    await window.takeLineAsync("click ", TIMEOUT_MS);
  }

  it("types into the text field, characters outside the keyboard included", async () => {
    await focusTextFieldAsync();
    await backend.input.typeTextAsync((await frontAsync()).target, "hello é😀", AbortSignal.timeout(TIMEOUT_MS));

    assert.equal(await window.takeLineAsync("text hello é😀", TIMEOUT_MS), "text hello é😀");
  });

  it("types a long text in chunks while the person's-input watch runs, and the window gets it whole", async () => {
    await focusTextFieldAsync();
    const text = "abcdefghij".repeat(40);
    const chunk = backend.input.maxTextChunkLength;
    await backend.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
    try {
      for (let at = 0; at < text.length; at += chunk)
        await backend.input.typeTextAsync((await frontAsync()).target, text.slice(at, at + chunk), AbortSignal.timeout(TIMEOUT_MS));
    } finally {
      await backend.physicalInput.stopAsync();
    }

    assert.equal(await window.takeLineAsync(`text ${text}`, TIMEOUT_MS), `text ${text}`);
  });

  it("reads the test window's controls: the text field's first 402 units only, the password field with no value, and the Save button inside the window", async () => {
    const front = await frontAsync();
    const text = `${"abcdefghij".repeat(40)}0123456789`;
    await backend.input.typeTextAsync(front.target, "0123456789", AbortSignal.timeout(TIMEOUT_MS));
    await window.takeLineAsync(`text ${text}`, TIMEOUT_MS);

    const tree = await backend.controls.readControlsAsync(front.target, null, AbortSignal.timeout(TIMEOUT_MS));

    const listed = tree.controls.map(t => `${t.role} "${t.name}" ${t.states.join(" ")}`).join("; ");
    const field = tree.controls.find(t => t.role === ControlRole.Edit && t.value?.startsWith("abcdefghij") === true);
    const password = tree.controls.find(t => t.role === ControlRole.Edit && t.states.includes(ControlState.Password));
    const save = tree.controls.find(t => t.role === ControlRole.Button && t.name === "Save");
    assert.ok(field !== undefined && password !== undefined && save !== undefined, `The read lists ${listed}.`);
    assert.equal(field.value, text.slice(0, 402));
    assert.equal(password.value, null);
    assert.ok(save.bounds !== null && isInside(front.frame, new DesktopPoint(save.bounds.x, save.bounds.y))
      && isInside(front.frame, new DesktopPoint(save.bounds.x + save.bounds.width - 1, save.bounds.y + save.bounds.height - 1)), `The Save button lies at ${JSON.stringify(save.bounds)}.`);
    assert.ok(tree.controls.every(t => t.app.id === front.app.id), `A control belongs to another app: ${tree.controls.map(t => t.app.id).join("; ")}.`);
    assert.equal(tree.isTimedOut, false);
  });

  it("finds the Save button again, finds it at its point but not at the marker's, and a click at its point presses it", async () => {
    const front = await frontAsync();
    const save = await readSaveAsync(front);
    const marker = await findMarkerAsync(front);

    const spot = await backend.controls.findControlAsync(front.target, save.handle, AbortSignal.timeout(TIMEOUT_MS));
    assert.ok(spot !== null, "The Save button wasn't found again.");
    const hit = await backend.controls.isControlAtAsync(front.target, save.handle, spot.point, AbortSignal.timeout(TIMEOUT_MS));
    const missed = await backend.controls.isControlAtAsync(front.target, save.handle, marker, AbortSignal.timeout(TIMEOUT_MS));

    assert.deepEqual([spot.role, spot.name, spot.isEnabled, spot.isOnScreen, hit, missed], [ControlRole.Button, "Save", true, true, true, false]);
    assert.ok(save.bounds !== null && spot.point.x >= save.bounds.x && spot.point.x < save.bounds.x + save.bounds.width
      && spot.point.y >= save.bounds.y && spot.point.y < save.bounds.y + save.bounds.height, `The point ${JSON.stringify(spot.point)} lies outside ${JSON.stringify(save.bounds)}.`);
    await backend.input.clickAsync((await frontAsync()).target, spot.point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));
    assert.equal(await window.takeLineAsync("pressed save", TIMEOUT_MS), "pressed save");
  });

  it("forgets a read's handles once a new read of the whole window comes, and finds the new read's", async () => {
    const front = await frontAsync();
    const earlier = await readSaveAsync(front);

    const later = await readSaveAsync(front);

    assert.notEqual(later.handle, earlier.handle);
    assert.equal(await backend.controls.findControlAsync(front.target, earlier.handle, AbortSignal.timeout(TIMEOUT_MS)), null);
    assert.notEqual(await backend.controls.findControlAsync(front.target, later.handle, AbortSignal.timeout(TIMEOUT_MS)), null);
  });

  it("keeps a read's handles when a later read of the whole window ends before it finds the window", async () => {
    const front = await frontAsync();
    const input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
    const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
    try {
      let slice = ReadSlice.read(await input.callAsync("readControls", { target, underHandle: null, timeoutMs: TIMEOUT_MS }));
      const rows = [...slice.controls];
      while (!slice.isDone) {
        slice = ReadSlice.read(await input.callAsync("continueControls", { read: slice.read }));
        rows.push(...slice.controls);
      }
      const save = rows.find(u => u.role === "AXButton" && u.name === "Save");
      assert.ok(save !== undefined, `The read lists no Save button among ${rows.map(u => `${u.role} "${u.name}"`).join("; ")}.`);

      const ended = ReadSlice.read(await input.callAsync("readControls", { target, underHandle: null, timeoutMs: 1 }));

      assert.deepEqual([ended.controls.length, ended.isTimedOut, ended.isDone], [0, true, true]);
      assert.notEqual(await input.callAsync("findControl", { handle: save.handle }), null);
    } finally {
      await input.closeAsync();
    }
  });

  it("lists another process's controls inside the test window as rows of their app only, reading nothing they say or hold", async t => {
    window.send("web");
    await window.takeLineAsync("web ready", TIMEOUT_MS);
    try {
      const front = await frontAsync();

      const tree = await backend.controls.readControlsAsync(front.target, null, AbortSignal.timeout(TIMEOUT_MS));

      const others = tree.controls.filter(u => u.app.id !== front.app.id);
      t.diagnostic(`Other apps' rows: ${others.map(u => `${u.app.id} ${u.role.value} "${u.name}" at ${JSON.stringify(u.bounds)}`).join("; ")}`);
      assert.ok(others.length > 0, `No row of another app is listed among ${tree.controls.map(u => `${u.role.value} "${u.name}"`).join("; ")}.`);
      for (const other of others) {
        assert.deepEqual([other.role, other.name, other.value, other.states], [ControlRole.Other, "", null, []]);
        assert.ok(!tree.controls.some(u => u.parentHandle === other.handle), `A control under ${other.app.id}'s row was read.`);
        assert.equal(await backend.controls.findControlAsync(front.target, other.handle, AbortSignal.timeout(TIMEOUT_MS)), null, `${other.app.id}'s row ${other.handle} was found again.`);
      }
      assert.ok(!tree.controls.some(u => u.name.includes("Web content") || u.value?.includes("Web content") === true), "The web page's text was read.");
    } finally {
      window.send("unweb");
      await window.takeLineAsync("web closed", TIMEOUT_MS);
    }
  });

  it("refuses to type into the password field, sending nothing", async () => {
    await backend.input.clickAsync((await frontAsync()).target, secureField, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));

    const refusal = await refusalOfAsync(backend.input.typeTextAsync((await frontAsync()).target, "x", AbortSignal.timeout(TIMEOUT_MS)));

    assert.ok(["SecureInput", "PasswordField"].includes(refusal.reason.value), `The refusal was ${refusal.reason.value}.`);
    assert.equal(refusal.isInputSent, false);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("secret")), []);
  });

  it("refuses typing while the app doesn't answer what is focused, as an unknown focus, sending nothing", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();
    window.send("block");
    await window.takeLineAsync("blocking", TIMEOUT_MS);
    let refusal: RefusalException;
    try {
      refusal = await refusalOfAsync(backend.input.typeTextAsync(front.target, "x", AbortSignal.timeout(TIMEOUT_MS)));
    } finally {
      await window.releaseAsync(TIMEOUT_MS);
    }
    assert.equal(await window.takeLineAsync("unblocked", TIMEOUT_MS), "unblocked");

    assert.equal(refusal.reason.value, "FocusUnknown");
    assert.equal(refusal.isInputSent, false);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("text")), []);
  });

  it("refuses typing and a key while another process's panel has the keyboard focus, as focus outside the target, sending nothing", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();
    const panel = MacKeyPanel.open(false);
    try {
      await panel.readyAsync(TIMEOUT_MS);

      const typing = await refusalOfAsync(backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));
      const key = await refusalOfAsync(backend.input.pressKeyAsync(front.target, KeyName.Tab, [], AbortSignal.timeout(TIMEOUT_MS)));

      assert.deepEqual([typing.reason.value, typing.isInputSent, key.reason.value, key.isInputSent], ["FocusOutsideTarget", false, "FocusOutsideTarget", false]);
      assert.deepEqual((await panel.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => !t.startsWith("ready ")), []);
    } finally {
      await panel.closeAsync(TIMEOUT_MS);
      await focusTextFieldAsync();
    }
  });

  it("refuses typing and a key while the app with the keyboard focus doesn't answer, as an unknown focus, sending nothing", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();
    const panel = MacKeyPanel.open(true);
    try {
      await panel.readyAsync(TIMEOUT_MS);

      const typing = await refusalOfAsync(backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));
      const key = await refusalOfAsync(backend.input.pressKeyAsync(front.target, KeyName.Tab, [], AbortSignal.timeout(TIMEOUT_MS)));

      assert.deepEqual([typing.reason.value, typing.isInputSent, key.reason.value, key.isInputSent], ["FocusUnknown", false, "FocusUnknown", false]);
      assert.deepEqual((await panel.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => !t.startsWith("ready ")), []);
    } finally {
      await panel.closeAsync(TIMEOUT_MS);
      await focusTextFieldAsync();
    }
  });

  it("types a Tab as the Tab key, which moves the focus on, and a line break as Return, refusing the text after either", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();

    const afterTab = await refusalOfAsync(backend.input.typeTextAsync(front.target, "alice\tS3cret", AbortSignal.timeout(TIMEOUT_MS)));
    const typed = await window.takeLineAsync("text ", TIMEOUT_MS);
    await window.takeLineAsync("focus secret", TIMEOUT_MS);
    const rest = await refusalOfAsync(backend.input.typeTextAsync(front.target, "S3cret", AbortSignal.timeout(TIMEOUT_MS)));

    assert.deepEqual([afterTab.reason.value, afterTab.isInputSent], ["PasswordField", true]);
    assert.ok(typed.endsWith("alice"), `The text field shows ${JSON.stringify(typed)}.`);
    assert.ok(["SecureInput", "PasswordField"].includes(rest.reason.value), `The Tab didn't move the focus to the secure field: the refusal was ${rest.reason.value}.`);
    assert.equal(rest.isInputSent, false);
    for (const [word, lineBreak] of [["bob", "\n"], ["carol", "\r"], ["dave", "\r\n"]] as const) {
      await focusTextFieldAsync();

      const afterBreak = await refusalOfAsync(backend.input.typeTextAsync(front.target, `${word}${lineBreak}S3cret`, AbortSignal.timeout(TIMEOUT_MS)));
      const broken = await window.takeLineAsync("text ", TIMEOUT_MS);

      assert.deepEqual([afterBreak.reason.value, afterBreak.isInputSent], ["PasswordField", true]);
      assert.ok(broken.endsWith(word), `After ${JSON.stringify(lineBreak)}, the text field shows ${JSON.stringify(broken)}.`);
    }
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.includes("S3cret") || t.startsWith("secret")), []);
  });

  it("types and presses a key while the app answers that no element has the keyboard focus", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();
    try {
      window.send("unfocus");
      assert.equal(await window.takeLineAsync("unfocused", TIMEOUT_MS), "unfocused");
      await backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS));
      await backend.input.pressKeyAsync(front.target, KeyName.Tab, [], AbortSignal.timeout(TIMEOUT_MS));

      assert.equal(await window.takeLineAsync("key ", TIMEOUT_MS), "key a");
      assert.equal(await window.takeLineAsync("key ", TIMEOUT_MS), "key \t");
    } finally {
      await focusTextFieldAsync();
    }
  });

  it("refuses typing as the person's input when the pointer moves while the app answers what is focused, after the check before it, sending nothing", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();
    const start = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
    const aside = new DesktopPoint(start.x, start.y - ASIDE);
    assert.ok(isInside(front.frame, start) && isInside(front.frame, aside), `The pointer's move from (${start.x}, ${start.y}) leaves the test window.`);
    await backend.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
    let refusal: RefusalException;
    let hookLines: readonly string[];
    try {
      window.send(`move-on-focus-read ${aside.x} ${aside.y}`);
      assert.equal(await window.takeLineAsync("armed", TIMEOUT_MS), "armed");
      refusal = await refusalOfAsync(backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));
      hookLines = window.takePending();
    } finally {
      await backend.physicalInput.stopAsync();
      await focusTextFieldAsync();
    }

    assert.ok(hookLines.includes("moved on focus read"),
      `The app was never asked for its focused element while the typing was checked; the typing was refused as ${refusal.reason.value}, input sent ${refusal.isInputSent}, and the window reported ${JSON.stringify(hookLines)}.`);
    assert.deepEqual([refusal.reason, refusal.isInputSent], [RefusalReason.PhysicalInput, false], `The pointer moved during the focus read, and the typing was refused as ${refusal.reason.value}, input sent ${refusal.isInputSent}.`);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("key ") || t.startsWith("text")), []);
  });

  it("refuses typing and a key as the person's input when the last check before sending reports it, sending nothing, and types when it doesn't", async () => {
    await focusTextFieldAsync();
    const front = await frontAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, bundleId: front.target.app.id };
    const refused = { status: "refused", reason: "PhysicalInput", inputSent: false };
    const reporting = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile, PERSON_INPUT_BEFORE_SEND], TIMEOUT_MS);
    try {
      assert.deepEqual(await reporting.callAsync("typeText", { target, text: "a" }), refused);
      assert.deepEqual(await reporting.callAsync("pressKey", { target, key: "Tab", modifiers: [] }), refused);
    } finally {
      await reporting.closeAsync();
    }
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("key ") || t.startsWith("text")), []);

    await focusTextFieldAsync();
    const ordinary = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);
    try {
      assert.deepEqual(await ordinary.callAsync("typeText", { target, text: "a" }), { status: "done" });
    } finally {
      await ordinary.closeAsync();
    }
    const typed = await window.takeLineAsync("text ", TIMEOUT_MS);
    assert.ok(typed.endsWith("a"), `The text field reads "${typed}" after the typing.`);
  });

  it("refuses input for another app's bundle identifier, sending nothing", async () => {
    const front = await frontAsync();
    const other = new InputTarget(AppIdentity.ofMacBundleId("com.example.other"), front.target.windowId, front.target.processId);

    const refusal = await refusalOfAsync(backend.input.pressKeyAsync(other, KeyName.Escape, [], AbortSignal.timeout(TIMEOUT_MS)));

    assert.equal(refusal.reason.value, "NotForeground");
    assert.equal(refusal.isInputSent, false);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t === "escape"), []);
  });

  it("refuses a click outside the test window, sending nothing", async () => {
    const front = await frontAsync();
    const outside = new DesktopPoint(front.frame.x - 40, front.frame.y + 40);

    const refusal = await refusalOfAsync(backend.input.clickAsync(front.target, outside, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)));

    assert.equal(refusal.reason.value, "OtherWindowAtPoint");
    assert.equal(refusal.isInputSent, false);
  });

  it("lists Mission Control's Dock windows whole over the test window, refuses a click under them, sending nothing, and gives the window back at its frame", async () => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);
    const isOver = (stack: WindowStack): boolean => {
      const at = stack.windows.findIndex(t => t.app?.id === front.app.id && JSON.stringify(t.frame) === JSON.stringify(front.frame));
      return stack.windows.slice(0, at === -1 ? stack.windows.length : at).some(t => t.app?.id === "com.apple.dock" && t.frame.x <= point.x && point.x < t.frame.x + t.frame.width && t.frame.y <= point.y && point.y < t.frame.y + t.frame.height);
    };
    const waitAsync = async (isWanted: (stack: WindowStack) => boolean): Promise<WindowStack> => {
      let stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
      for (const deadline = Date.now() + TIMEOUT_MS; !isWanted(stack) && Date.now() < deadline;) {
        await delay(250);
        stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
      }
      return stack;
    };
    const isBack = (stack: WindowStack): boolean =>
      !isOver(stack) && JSON.stringify(stack.windows.find(t => t.windowId === windowId)?.frame) === JSON.stringify(front.frame);
    let closed: WindowStack | null = null;
    let isShown = false;
    execFileSync("open", ["-a", "Mission Control"]);
    try {
      const stack = await waitAsync(isOver);
      isShown = isOver(stack);
      assert.ok(isShown, `No Dock window is listed over the marker at ${point.x}, ${point.y} while Mission Control is open; ${await describeCoverAsync(front)}.`);

      const refusal = await refusalOfAsync(backend.input.clickAsync(front.target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)));

      assert.ok(["OtherWindowAtPoint", "NotForeground"].includes(refusal.reason.value), `The click was refused as ${refusal.reason.value}.`);
      assert.equal(refusal.isInputSent, false);
    } finally {
      const stack = isShown ? await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS)) : await waitAsync(isOver);
      if (isOver(stack))
        execFileSync("open", ["-a", "Mission Control"]);
      closed = await waitAsync(isBack);
    }
    const listed = closed.windows.find(t => t.windowId === windowId);
    const where = listed === undefined ? "isn't listed" : `is listed at ${JSON.stringify(listed.frame)}`;
    assert.ok(isBack(closed), `The test window ${where}, not back at ${JSON.stringify(front.frame)}, once Mission Control closes; ${await describeCoverAsync(front)}.`);
    assert.deepEqual((await window.takeUntilSentinelAsync(TIMEOUT_MS)).filter(t => t.startsWith("click ")), []);
  });

  it("reports the person's input at the first poll after the input process ended during a watch, since the new process holds no watch", async () => {
    const input = new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS);

    try {
      await input.callAsync("startWatch", {});
      const watched = await input.callAsync("pollWatch", {});
      await input.closeAsync();
      const restarted = await input.callAsync("pollWatch", {});

      assert.deepEqual([watched, restarted], [{ hasMoved: false }, { hasMoved: true }]);
    } finally {
      await input.closeAsync();
    }
  });

  it("watches the pointer, with heartbeats and no report of the module's own input, a glide's, a drag's, a click's and a scroll's among it", async () => {
    const front = await frontAsync();
    const point = await findMarkerAsync(front);
    const start = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
    const reports: unknown[] = [];
    let beats = 0;
    let enough = Number.POSITIVE_INFINITY;
    let onEnough: (() => void) | null = null;
    const onInput = backend.physicalInput.onPhysicalInput(t => reports.push(t));
    const onBeat = backend.physicalInput.onHeartbeat(() => {
      beats++;
      if (beats >= enough)
        onEnough?.();
    });
    await backend.input.movePointerAsync(front.target, start, AbortSignal.timeout(TIMEOUT_MS));
    try {
      await backend.physicalInput.startAsync(AbortSignal.timeout(TIMEOUT_MS));
      await backend.input.movePointerAsync(front.target, point, AbortSignal.timeout(TIMEOUT_MS));
      await backend.input.dragAsync(front.target, point, new DesktopPoint(point.x + 60, point.y + 40), PointerButton.Left, [], AbortSignal.timeout(TIMEOUT_MS));
      await window.takeLineAsync("drag ", TIMEOUT_MS);
      await backend.input.clickAsync(front.target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));
      await window.takeLineAsync("click ", TIMEOUT_MS);
      await backend.input.scrollAsync(front.target, point, new ScrollAmount(0, 3), [], AbortSignal.timeout(TIMEOUT_MS));
      await window.takeLineAsync("scroll ", TIMEOUT_MS);
      const counted = beats;
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      await new Promise<void>((resolve, reject) => {
        enough = counted + HEARTBEATS;
        onEnough = resolve;
        signal.addEventListener("abort", () => reject(new Error(`The monitor beat ${beats - counted} times after the scroll within ${TIMEOUT_MS} ms, not ${HEARTBEATS}.`)), { once: true });
      });
      await backend.physicalInput.stopAsync();
    } finally {
      onInput[Symbol.dispose]();
      onBeat[Symbol.dispose]();
    }

    assert.deepEqual(reports, []);
  });

  it("presses Escape, which closes the test window", async () => {
    await focusTextFieldAsync();
    await backend.input.pressKeyAsync((await frontAsync()).target, KeyName.Escape, [], AbortSignal.timeout(TIMEOUT_MS)).catch((error: unknown) => {
      assert.ok(error instanceof RefusalException && error.reason.value === "ForegroundChanged" && error.isInputSent, `Escape failed with ${String(error)}.`);
    });

    assert.equal(await window.takeLineAsync("escape", TIMEOUT_MS), "escape");
    assert.equal(await window.takeLineAsync("closed", TIMEOUT_MS), "closed");
    assert.equal(await window.exitAsync(TIMEOUT_MS), true);
  });
});
