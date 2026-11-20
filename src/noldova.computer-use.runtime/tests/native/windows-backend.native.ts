/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { AppIdentity, BorderFrame, ClickCount, type ControlInfo, ControlRole, ControlState, DesktopPoint, KeyName, ModifierKey, PointerButton, RefusalException, RefusalReason, type StackedWindow, WindowImage, type WindowInfo } from "@noldova/computer-use.runtime";
import { type IWindowsStackedWindowJson, WindowsBackend } from "@noldova/computer-use.runtime/windows";

import { PngImage } from "../services/png-image.fixture.ts";

import { RgbColour, WindowsDesktopSession } from "./windows-desktop-session.fixture.ts";
import { WindowsTestWindow } from "./windows-test-window.fixture.ts";

const TIMEOUT_MS = WindowsDesktopSession.TIMEOUT_MS;
const POLL_MS = WindowsDesktopSession.POLL_MS;
const LIME = new RgbColour(0, 255, 0);
const COVER_SIDE = 120;
const CAPTURE_TIMES = 10;
const BACKDROP_COVER_SIDE = 320;
const BACKDROP_INSET = 40;
const ACRYLIC_BACKDROP = 3;
const SYSTEM_BACKDROP_BUILD = 22621;
const S_OK = "0x00000000";
const CAPTURE_DEADLINE_MS = 500;
const NOTIFICATION_TAG = "computer-use-test";
const NOTIFICATION_GROUP = "computer-use-native";
const NOTIFIER = "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'";
const NOTIFY = `${NOTIFIER}; [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null; $xml = New-Object Windows.Data.Xml.Dom.XmlDocument; $xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>Computer-use test</text></binding></visual></toast>'); $toast = [Windows.UI.Notifications.ToastNotification]::new($xml); $toast.Tag = '${NOTIFICATION_TAG}'; $toast.Group = '${NOTIFICATION_GROUP}'; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show($toast)`;
const REMOVE_NOTIFICATION = `${NOTIFIER}; [Windows.UI.Notifications.ToastNotificationManager]::History.Remove('${NOTIFICATION_TAG}', '${NOTIFICATION_GROUP}', $app)`;
const FOLDER_WINDOW_CLASS = "CabinetWClass";
const CHILD_WIDTH = 180;
const CHILD_TEXT = "Other app's text";
const CHILD_BOX_X = 88;
const CHILD_BOX_Y = 66;
const CALCULATOR = "CalculatorApp.exe";
const FRAME_WINDOW_CLASS = "ApplicationFrameWindow";
const DIGIT_SHOWN = /\b7$/;
const TASKKILL_NOT_FOUND = 128;
const MAX_SCROLL_NOTCHES = 50;
const MOVE_AWAY = 600;
const GLIDE_START_INSET = 40;

const NOTIFICATION_POLL_MS = 250;
const HELD_READ_LIMIT_MS = 300;
const HELD_READ_COUNT = 40;
const LOOKUP_LIBRARIES = ["oleacc.dll", "uiamanager.dll"];
const AFTER_START = `import { createRequire } from "node:module";
const [addonFile, wanted, limitMs] = process.argv.slice(1);
createRequire(addonFile)(addonFile);
const libraries = JSON.parse(wanted);
const deadline = Date.now() + Number(limitMs);
const poll = () => {
  const loaded = process.report.getReport().sharedObjects.map(t => t.toLowerCase().split("\\\\").pop());
  const missing = libraries.filter(t => !loaded.includes(t));
  if (missing.length === 0 || Date.now() > deadline) {
    console.log(JSON.stringify(missing));
    process.exit(0);
  }
  setTimeout(poll, 20);
};
poll();`;
const READ_AT_START = `import { createRequire } from "node:module";
const [addonFile, target, limitMs] = process.argv.slice(1);
const addon = createRequire(addonFile)(addonFile);
const read = await addon.readControls(JSON.parse(target), null, Number(limitMs));
console.log(JSON.stringify([read.controls.some(t => t.name === "Save"), read.timedOut]));
process.exit(0);`;

describe("the Windows backend on the desktop", { skip: process.platform !== "win32" ? "The Windows backend runs on Windows only." : false }, () => {
  const session = new WindowsDesktopSession();
  const backend = session.backend;

  async function frontPasswordWindowAsync(box: WindowsTestWindow): Promise<WindowInfo> {
    const boxId = WindowsDesktopSession.readId(await box.takeLineAsync("ready ", WindowsTestWindow.START_MS));

    return await session.frontOfAsync(box, boxId);
  }

  async function openSecondAsync(other: WindowsTestWindow): Promise<WindowInfo> {
    const otherId = WindowsDesktopSession.readId(await other.takeLineAsync("ready ", WindowsTestWindow.START_MS));

    return await session.frontOfAsync(other, otherId);
  }

  async function failureOfAsync(call: () => Promise<unknown>): Promise<unknown> {
    return await call().then(() => null, (error: unknown) => error);
  }

  function seamOf(addon: unknown): () => void {
    assert.ok(typeof addon === "object" && addon !== null && "personInputBeforeNextSend" in addon, "The addon has no person-input seam.");
    const mark = addon.personInputBeforeNextSend;
    assert.ok(typeof mark === "function", "The addon's person-input seam isn't a function.");

    return () => {
      mark.call(addon);
    };
  }

  before(async () => {
    await session.openAsync();
  });

  after(async () => {
    await session.closeAsync();
  });

  afterEach(async t => {
    assert.ok("passed" in t, "The hook got no test's result.");
    if (t.passed)
      return;
    const left = await session.reopenAsync();
    if (left.length > 0)
      t.diagnostic(`The test left the test window's lines ${JSON.stringify(left)}; the window was closed and a new one opened, so the next test doesn't read them.`);
  });

  it("describes a program by its file, with its icon as a PNG 64 pixels a side whose clear pixels keep their alpha", async () => {
    const app = await backend.apps.describeAppAsync(AppIdentity.ofWindowsPath(process.execPath), 64, AbortSignal.timeout(TIMEOUT_MS));

    assert.ok(app !== null, `${process.execPath} wasn't described.`);
    assert.equal(app.name, "Node.js JavaScript Runtime");
    assert.ok(app.icon !== null, "The program's icon wasn't read.");
    const icon = PngImage.read(app.icon);
    assert.deepEqual([icon.width, icon.height, icon.channels], [64, 64, 4]);
    const alphas = icon.rows().flat().map(t => t[3] ?? Number.NaN);
    assert.ok(alphas.includes(0) && alphas.includes(255), `The icon's alphas run from ${Math.min(...alphas)} to ${Math.max(...alphas)}, not from clear to solid.`);
    assert.equal(await backend.apps.describeAppAsync(AppIdentity.ofWindowsPath(path.join(path.dirname(process.execPath), "absent.exe")), 64, AbortSignal.timeout(TIMEOUT_MS)), null);
  });

  it("reads the test window in front, not elevated", async () => {
    const front = await session.frontAsync();

    assert.equal(front.appName.toLowerCase(), "powershell");
    assert.equal(front.isElevated, false);
    assert.ok(front.frame.width > 480 && front.frame.height > 320);
    assert.match(session.addon.getForegroundWindow()?.className ?? "", /^WindowsForms10\.Window\./);
  });

  it("lists the test window among the windows that may show, with its program and frame", async () => {
    const front = await session.frontAsync();

    const stack = await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS));
    const listed = stack.windows.filter(t => t.app?.id === front.app.id && t.frame.x === front.frame.x && t.frame.y === front.frame.y);

    assert.equal(stack.isComplete, true);
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0]?.frame, front.frame);
  });

  it("shows the border out of the window list, passing hit tests through and leaving the focus where it was", async () => {
    await session.frontAsync();
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    const displays = await backend.displays.listDisplaysAsync(signal);
    const frames = displays.map(t => BorderFrame.of(t, backend.border.unitsPerPixel(t)));
    const own = AppIdentity.ofWindowsPath(process.execPath);
    try {
      await backend.border.showAsync(frames, "#005FB8", signal);
      await backend.border.showAsync(frames, "#005FB8", signal);

      const { windows } = await backend.windows.listStackAsync(signal);
      assert.deepEqual(windows.filter(t => t.app?.id === own.id).map(t => t.frame), []);
      for (const frame of frames) {
        const [x, y] = [frame.bounds.x + Math.floor(frame.thickness / 2), frame.bounds.y + Math.floor(frame.thickness / 2)];
        const owner = WindowsDesktopSession.runPowerShell(`${WindowsDesktopSession.USER32}; [uint32] $id = 0; $point = New-Object System.Drawing.Point(${x}, ${y}); ` +
          "[NoldovaNativeTest.User32]::GetWindowThreadProcessId([NoldovaNativeTest.User32]::WindowFromPoint($point), [ref] $id) | Out-Null; $id");
        assert.notEqual(owner, String(process.pid), `The window at ${x}, ${y} on the border is the border's own.`);
      }
      await session.frontAsync();
    } finally {
      await backend.border.hideAsync(AbortSignal.timeout(TIMEOUT_MS));
    }
  });

  it("lists an immersive window, a notification, in front of the test window", async () => {
    const front = await session.frontAsync();
    const earlier = (await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS))).windows;
    const isSameWindow = (window: StackedWindow, other: StackedWindow): boolean => window.app?.id === other.app?.id && JSON.stringify(window.frame) === JSON.stringify(other.frame);
    try {
      WindowsDesktopSession.runPowerShell(NOTIFY);
      let windows: readonly StackedWindow[] = [];
      let shown = -1;
      for (const deadline = Date.now() + TIMEOUT_MS; shown === -1 && Date.now() < deadline;) {
        await delay(NOTIFICATION_POLL_MS);
        windows = (await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS))).windows;
        shown = windows.findIndex(t => !earlier.some(u => isSameWindow(t, u)));
      }
      const listed = windows.map(t => `${t.app?.id ?? "no app"} at ${JSON.stringify(t.frame)}`).join("; ");
      const test = windows.findIndex(t => t.app?.id === front.app.id && JSON.stringify(t.frame) === JSON.stringify(front.frame));

      assert.ok(shown !== -1, `No new window was listed after the notification; the list holds ${listed}.`);
      assert.ok(test !== -1 && shown < test, `The new window ${shown} isn't in front of the test window ${test}; the list holds ${listed}.`);
    } finally {
      WindowsDesktopSession.runPowerShell(REMOVE_NOTIFICATION);
    }
  });

  it("captures the marker, clicks it, the window reports the click on it, and the pointer reads where the click left it", async () => {
    const front = await session.frontAsync();
    const { point } = await session.findMarkerAsync();

    const target = (await session.frontAsync()).target;
    assert.ok(WindowsDesktopSession.isInside(front.frame, point), "The marker lies too near the test window's edge.");
    await backend.input.clickAsync(target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));

    const [, x, y] = (await session.window.takeLineAsync("click ", TIMEOUT_MS)).split(" ").map(Number);
    assert.ok(x !== undefined && x >= 0 && x < 48 && y !== undefined && y >= 0 && y < 48, `The click landed at ${x}, ${y} of the marker.`);
    assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), point);
  });

  it("drags from the marker with Shift held, and the window reports the drag", async () => {
    const front = await session.frontAsync();
    const { point: from } = await session.findMarkerAsync();
    const to = new DesktopPoint(from.x + 60, from.y + 40);

    const target = (await session.frontAsync()).target;
    assert.ok(WindowsDesktopSession.isInside(front.frame, from) && WindowsDesktopSession.isInside(front.frame, to), "The drag reaches too near the test window's edge.");
    await backend.input.dragAsync(target, from, to, PointerButton.Left, [ModifierKey.Shift], AbortSignal.timeout(TIMEOUT_MS));

    const [, dx, dy, ...modifiers] = (await session.window.takeLineAsync("drag ", TIMEOUT_MS)).split(" ");
    assert.ok(Math.abs(Number(dx) - 60) <= 1 && Math.abs(Number(dy) - 40) <= 1, `The drag moved ${dx}, ${dy}.`);
    assert.equal(modifiers.join(" "), "Shift");
  });

  it("answers a drag whose flag is set before its press as stopped with nothing sent, and refuses a flag over memory that isn't shared", async () => {
    const front = await session.frontAsync();
    const { point: from } = await session.findMarkerAsync();
    const to = new DesktopPoint(from.x + 60, from.y + 40);
    await backend.input.movePointerAsync(front.target, from, AbortSignal.timeout(TIMEOUT_MS));
    const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.target.app.id };
    const steps = [{ x: to.x, y: to.y, atMs: 0 }];
    const stop = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    Atomics.store(stop, 0, 1);

    assert.deepEqual(await session.addon.drag(target, from.x, from.y, to.x, to.y, steps, "Left", [], stop), { status: "stopped", inputSent: false });
    assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), from);
    assert.equal(WindowsDesktopSession.readButtons(), "None");
    assert.throws(() => session.addon.drag(target, from.x, from.y, to.x, to.y, steps, "Left", [], new Int32Array(1)), { name: "TypeError" });
    const lines = await session.enterBarrierAsync(session.window, front.target);
    assert.deepEqual(lines.filter(u => u.startsWith("drag ")), []);
  });

  async function awayFromAsync(point: DesktopPoint): Promise<WindowInfo> {
    session.window.send(`move ${MOVE_AWAY} 0`);
    await session.window.takeLineAsync("moved ", TIMEOUT_MS);
    const front = await session.frontAsync();
    assert.ok(point.x < front.frame.x, `The test window at ${JSON.stringify(front.frame)} still holds ${point.x}, ${point.y} after its move.`);

    return front;
  }

  async function moveBackAsync(inside: DesktopPoint): Promise<void> {
    session.window.send(`move ${-MOVE_AWAY} 0`);
    await session.window.takeLineAsync("moved ", TIMEOUT_MS);
    await session.warpAsync(inside);
  }

  it("refuses a glide to a point the test window has moved away from, leaving the pointer where it was and sending no click", async () => {
    await session.frontAsync();
    const { point } = await session.findMarkerAsync();
    let lines: readonly string[] = [];
    let clicked: unknown = null;
    let pointer: DesktopPoint | null = null;
    let start = point;
    try {
      const front = await awayFromAsync(point);
      start = new DesktopPoint(front.frame.x + GLIDE_START_INSET, front.frame.y + front.frame.height - GLIDE_START_INSET);
      assert.ok(WindowsDesktopSession.isInside(front.frame, start), "The glide's start lies too near the test window's edge.");
      await session.warpAsync(start);

      clicked = await failureOfAsync(() => backend.input.clickAsync(front.target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)));
      pointer = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
      lines = await session.enterBarrierAsync(session.window, front.target);
    } finally {
      await moveBackAsync(point);
    }

    assert.deepEqual(clicked instanceof RefusalException ? [clicked.reason, clicked.isInputSent] : clicked, [RefusalReason.OtherWindowAtPoint, false]);
    assert.deepEqual(pointer, start);
    assert.deepEqual(lines.filter(u => u.startsWith("click ")), []);
  });

  it("refuses a drag whose end lies where the test window has moved away from before its press, pressing nothing", async () => {
    await session.frontAsync();
    const { point: to } = await session.findMarkerAsync();
    let lines: readonly string[] = [];
    let dragged: unknown = null;
    let pointer: DesktopPoint | null = null;
    let from = to;
    try {
      const front = await awayFromAsync(to);
      from = (await session.findMarkerAsync()).point;
      assert.ok(WindowsDesktopSession.isInside(front.frame, from), "The marker lies too near the test window's edge.");
      await session.warpAsync(from);
      assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), from);

      dragged = await failureOfAsync(() => backend.input.dragAsync(front.target, from, to, PointerButton.Left, [], AbortSignal.timeout(TIMEOUT_MS)));
      pointer = await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS));
      lines = await session.enterBarrierAsync(session.window, front.target);
    } finally {
      await moveBackAsync(to);
    }

    assert.deepEqual(dragged instanceof RefusalException ? [dragged.reason, dragged.isInputSent] : dragged, [RefusalReason.OtherWindowAtPoint, false]);
    assert.deepEqual(pointer, from);
    assert.equal(WindowsDesktopSession.readButtons(), "None");
    assert.deepEqual(lines.filter(u => u.startsWith("drag ")), []);
  });

  it("refuses a scroll of more than 50 notches along either axis before it sends anything", async () => {
    const front = await session.frontAsync();
    const { point } = await session.findMarkerAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.target.app.id };

    for (const [deltaX, deltaY] of [[MAX_SCROLL_NOTCHES + 1, 0], [0, MAX_SCROLL_NOTCHES + 1], [-MAX_SCROLL_NOTCHES - 1, 0], [0, -MAX_SCROLL_NOTCHES - 1]])
      assert.throws(() => session.addon.scroll(target, point.x, point.y, deltaX ?? 0, deltaY ?? 0, []), { name: "RangeError", code: "ERR_WINDOWS_DESKTOP", message: "The scroll is more than 50 notches along an axis." });
    const lines = await session.enterBarrierAsync(session.window, front.target);
    assert.deepEqual(lines.filter(u => u.startsWith("wheel ")), []);
  });

  it("captures the test window's own pixels under another window over its marker, with none of that window's colour", async t => {
    await session.frontAsync();
    const marker = await session.findMarkerAsync();
    const cover = new WindowsTestWindow("cover-window.ps1", { X: marker.point.x - COVER_SIDE / 2, Y: marker.point.y - COVER_SIDE / 2, WIDTH: COVER_SIDE, HEIGHT: COVER_SIDE });
    try {
      const coverId = WindowsDesktopSession.readId(await cover.takeLineAsync("ready ", WindowsTestWindow.START_MS));
      let windows: readonly StackedWindow[] = [];
      let coverAt = -1;
      let testAt = -1;
      for (const deadline = Date.now() + TIMEOUT_MS; !(coverAt !== -1 && coverAt < testAt) && Date.now() < deadline; await delay(POLL_MS)) {
        windows = (await session.listTestWindowAsync()).windows;
        coverAt = windows.findIndex(u => u.windowId === coverId);
        testAt = windows.findIndex(u => u.windowId === session.windowId);
      }
      const frame = windows[coverAt]?.frame;
      assert.ok(frame !== undefined && coverAt < testAt, `The cover window ${coverId} isn't listed in front of the test window; it is at ${coverAt}, the test window at ${testAt}.`);
      assert.ok(frame.x <= marker.point.x && marker.point.x < frame.x + frame.width && frame.y <= marker.point.y && marker.point.y < frame.y + frame.height, `The cover window at ${JSON.stringify(frame)} doesn't lie over the marker at ${marker.point.x}, ${marker.point.y}.`);
      await session.frontAsync();

      const { image, rgb } = await session.captureTestWindowAsync();
      const limes = WindowsDesktopSession.scan(image, rgb, LIME);
      const markers = WindowsDesktopSession.scan(image, rgb, WindowsDesktopSession.MARKER);
      if (limes.found.length > 0 || markers.found.length !== marker.pixels)
        WindowsDesktopSession.keep(image, rgb, "test-window-covered.ppm");

      assert.equal(limes.found.length, 0, `The test window's image shows ${limes.found.length} pixels of the cover window's colour; its commonest colours are ${limes.common}.`);
      assert.equal(markers.found.length, marker.pixels, `The test window's image shows ${markers.found.length} of the marker's ${marker.pixels} pixels under the cover window.`);

      const { listed } = await session.listTestWindowAsync();
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

  it("captures the test window while its thread is held, off the JavaScript thread, and answers the window's image once the hold ends", async t => {
    await session.frontAsync();
    const { listed } = await session.listTestWindowAsync();
    const { x, y, width, height } = listed.frame;
    session.window.send("hold");
    await session.window.takeLineAsync("held", TIMEOUT_MS);
    let isReleased = false;
    try {
      const pending = session.addon.captureWindow(listed.windowId, x, y, width, height, TIMEOUT_MS);
      assert.ok(pending instanceof Promise, "The capture drew the window on the JavaScript thread.");
      session.window.send("release");
      isReleased = true;
      await session.window.takeLineAsync("released", TIMEOUT_MS);
      const image = await pending;
      const markers = image === null ? 0 : WindowsDesktopSession.scan(new WindowImage(image.width, image.height, new Uint8Array(image.bgra)), WindowsDesktopSession.readRgb(new Uint8Array(image.bgra)), WindowsDesktopSession.MARKER).found.length;
      t.diagnostic(`the capture of the held test window answered ${image === null ? "no image" : `an image with ${markers} marker pixels`}`);

      assert.notEqual(image, null, "The held test window's capture drew no image after the hold ended.");
      assert.notEqual(markers, 0, "The held test window's image shows no marker.");
    } finally {
      if (!isReleased) {
        session.window.send("release");
        await session.window.takeLineAsync("released", TIMEOUT_MS);
      }
    }
  });

  it("answers two captures of a window at once, and frees the window for a later capture", async t => {
    await session.frontAsync();
    const { listed } = await session.listTestWindowAsync();
    const { x, y, width, height } = listed.frame;

    const first = session.addon.captureWindow(listed.windowId, x, y, width, height, CAPTURE_DEADLINE_MS);
    const second = session.addon.captureWindow(listed.windowId, x, y, width, height, CAPTURE_DEADLINE_MS);
    const [firstImage, secondImage] = await Promise.all([first, second]);
    t.diagnostic(`the first capture answered ${firstImage === null ? "no image" : "an image"}, the second ${secondImage === null ? "no image" : "an image"}`);

    assert.notEqual(firstImage, null, "The first capture drew no image.");
    assert.notEqual(await session.addon.captureWindow(listed.windowId, x, y, width, height, CAPTURE_DEADLINE_MS), null, "A capture after both drew no image.");
  });

  it("captures a window with an acrylic backdrop over another window with none of that window's colour in its image", async t => {
    const build = Number(os.release().split(".")[2]);
    if (build < SYSTEM_BACKDROP_BUILD) {
      t.skip(`Windows build ${build} has no system backdrops, which start at build ${SYSTEM_BACKDROP_BUILD}.`);
      return;
    }

    const front = await session.frontAsync();
    const x = front.frame.x + front.frame.width + BACKDROP_INSET;
    const y = front.frame.y;
    const cover = new WindowsTestWindow("cover-window.ps1", { X: x, Y: y, WIDTH: BACKDROP_COVER_SIDE, HEIGHT: BACKDROP_COVER_SIDE });
    let backdrop: WindowsTestWindow | null = null;
    try {
      await cover.takeLineAsync("ready ", WindowsTestWindow.START_MS);
      const side = BACKDROP_COVER_SIDE - 2 * BACKDROP_INSET;
      backdrop = new WindowsTestWindow("backdrop-window.ps1", { X: x + BACKDROP_INSET, Y: y + BACKDROP_INSET, WIDTH: side, HEIGHT: side, BACKDROP: ACRYLIC_BACKDROP });
      const [, backdropId = "", asked = "", set = "", got = ""] = (await backdrop.takeLineAsync("ready ", WindowsTestWindow.START_MS)).split(" ");
      assert.ok(set === S_OK && got === S_OK, `Windows refused the backdrop window's backdrop: setting it returned ${set}, and reading it back ${got}.`);
      assert.equal(Number(asked), ACRYLIC_BACKDROP, `Windows answers that the backdrop window asks for backdrop ${asked}, not acrylic, ${ACRYLIC_BACKDROP}.`);
      const listed = (await session.listTestWindowAsync()).windows.find(u => u.windowId === backdropId);
      assert.ok(listed !== undefined, `The backdrop window ${backdropId} isn't listed.`);
      const image = await backend.capture.captureWindowAsync(listed, AbortSignal.timeout(TIMEOUT_MS));
      assert.ok(image !== null, `The backdrop window at ${JSON.stringify(listed.frame)} couldn't be captured.`);

      const rgb = WindowsDesktopSession.readRgb(image.bgra);
      const tints = WindowsDesktopSession.scan(image, rgb, (red, green, blue) => green > red + 40 && green > blue + 40);
      if (tints.found.length > 0)
        WindowsDesktopSession.keep(image, rgb, "backdrop-window.ppm");
      t.diagnostic(`the backdrop window's capture showed ${tints.found.length} of ${image.width * image.height} pixels tinted green; its commonest colours are ${tints.common}`);

      assert.equal(tints.found.length, 0, `The backdrop window's image shows ${tints.found.length} pixels tinted by the cover window's colour; its commonest colours are ${tints.common}.`);
    } finally {
      await backdrop?.closeAsync(TIMEOUT_MS);
      await cover.closeAsync(TIMEOUT_MS);
    }
  });

  it("types into the test window's text box", async () => {
    await backend.input.typeTextAsync((await session.frontAsync()).target, "hello", AbortSignal.timeout(TIMEOUT_MS));

    assert.equal(await session.window.takeLineAsync("text hello", TIMEOUT_MS), "text hello");
  });

  it("reads the test window's controls: the text box with its value, the password box with none, and the Save button inside the window", async () => {
    const front = await session.frontAsync();

    const tree = await backend.controls.readControlsAsync(front.target, null, AbortSignal.timeout(TIMEOUT_MS));

    const listed = tree.controls.map(t => `${t.role} "${t.name}"`).join("; ");
    const box = tree.controls.find(t => t.role === ControlRole.Edit && t.value === "hello");
    const password = tree.controls.find(t => t.role === ControlRole.Edit && t.name === "Password");
    const save = tree.controls.find(t => t.role === ControlRole.Button && t.name === "Save");
    assert.ok(box !== undefined && password !== undefined && save !== undefined, `The read lists ${listed}.`);
    assert.ok(box.states.includes(ControlState.Focused), `The text box's states are ${box.states.join(", ")}.`);
    assert.deepEqual([password.value, password.states], [null, [ControlState.Password]]);
    assert.ok(save.bounds !== null && WindowsDesktopSession.isInside(front.frame, new DesktopPoint(save.bounds.x, save.bounds.y))
      && WindowsDesktopSession.isInside(front.frame, new DesktopPoint(save.bounds.x + save.bounds.width - 1, save.bounds.y + save.bounds.height - 1)), `The Save button lies at ${JSON.stringify(save.bounds)}.`);
    assert.deepEqual(tree.controls.filter(t => t.app.id !== front.app.id).map(t => t.app.id), []);
    assert.equal(tree.isTimedOut, false);
  });

  it("ends a read of the test window while its thread is held at the read's limit, leaving no UI Automation call running into the next request", async () => {
    const front = await session.frontAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.app.id };
    session.window.send("hold");
    await session.window.takeLineAsync("held", TIMEOUT_MS);
    let isReleased = false;
    try {
      const held = await session.addon.readControls(target, null, HELD_READ_LIMIT_MS);
      const next = await failureOfAsync(() => session.addon.readControls(target, null, HELD_READ_LIMIT_MS));
      session.window.send("release");
      isReleased = true;
      await session.window.takeLineAsync("released", TIMEOUT_MS);

      assert.deepEqual([held.controls.length, held.timedOut], [0, true]);
      assert.equal(next, null, `The next read failed: ${String(next)}`);
    } finally {
      if (!isReleased) {
        session.window.send("release");
        await session.window.takeLineAsync("released", TIMEOUT_MS);
      }
    }
  });

  it("answers each of many reads of the test window while its thread is held as timed out, even when UI Automation's time limit ends before the read's clock does", async () => {
    const front = await session.frontAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.app.id };
    session.window.send("hold");
    await session.window.takeLineAsync("held", TIMEOUT_MS);
    const answers: string[] = [];
    try {
      for (let index = 0; index < HELD_READ_COUNT; index++)
        answers.push(await session.addon.readControls(target, null, HELD_READ_LIMIT_MS + index)
          .then(read => `${read.controls.length} ${read.timedOut}`, (error: unknown) => `read ${index}: ${String(error)}`));
    } finally {
      session.window.send("release");
      await session.window.takeLineAsync("released", TIMEOUT_MS);
    }

    assert.deepEqual(answers.filter(answer => answer !== "0 true"), []);
  });

  it("loads the libraries a window's first lookup needs as UI Automation starts, before any read, so the first read's limit doesn't pay for them", async () => {
    const { stdout } = await promisify(execFile)(process.execPath, ["--input-type=module", "-e", AFTER_START, WindowsBackend.addonFile, JSON.stringify(LOOKUP_LIBRARIES), String(TIMEOUT_MS)], { timeout: 2 * TIMEOUT_MS });

    assert.deepEqual(JSON.parse(stdout), []);
  });

  it("answers a read made as the addon loads with the window's controls, its limit starting once UI Automation's start has ended", async () => {
    const front = await session.frontAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.app.id };
    const { stdout } = await promisify(execFile)(process.execPath, ["--input-type=module", "-e", READ_AT_START, WindowsBackend.addonFile, JSON.stringify(target), String(HELD_READ_LIMIT_MS)], { timeout: 2 * TIMEOUT_MS });

    assert.deepEqual(JSON.parse(stdout), [true, false]);
  });

  it("finds the Save button again, finds it at its point but not at the marker's, and a click at its point presses it", async () => {
    const front = await session.frontAsync();
    const save = await readSaveAsync(front);
    const { point: marker } = await session.findMarkerAsync();

    const spot = await backend.controls.findControlAsync(front.target, save.handle, AbortSignal.timeout(TIMEOUT_MS));
    assert.ok(spot !== null, "The Save button wasn't found again.");
    const hit = await backend.controls.isControlAtAsync(front.target, save.handle, spot.point, AbortSignal.timeout(TIMEOUT_MS));
    const missed = await backend.controls.isControlAtAsync(front.target, save.handle, marker, AbortSignal.timeout(TIMEOUT_MS));

    assert.deepEqual([spot.role, spot.name, spot.isEnabled, spot.isOnScreen, hit, missed], [ControlRole.Button, "Save", true, true, true, false]);
    assert.ok(save.bounds !== null && spot.point.x >= save.bounds.x && spot.point.x < save.bounds.x + save.bounds.width
      && spot.point.y >= save.bounds.y && spot.point.y < save.bounds.y + save.bounds.height, `The point ${JSON.stringify(spot.point)} lies outside ${JSON.stringify(save.bounds)}.`);
    await backend.input.clickAsync((await session.frontAsync()).target, spot.point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));
    assert.equal(await session.window.takeLineAsync("pressed save", TIMEOUT_MS), "pressed save");
  });

  async function readSaveAsync(front: WindowInfo): Promise<ControlInfo> {
    const tree = await backend.controls.readControlsAsync(front.target, null, AbortSignal.timeout(TIMEOUT_MS));
    const save = tree.controls.find(t => t.role === ControlRole.Button && t.name === "Save");
    assert.ok(save !== undefined, `The read lists no Save button among ${tree.controls.map(t => `${t.role} "${t.name}"`).join("; ")}.`);

    return save;
  }

  it("forgets a read's handles once a new read of the whole window comes, and finds the new read's", async () => {
    const front = await session.frontAsync();
    const earlier = await readSaveAsync(front);

    const later = await readSaveAsync(front);

    assert.notEqual(later.handle, earlier.handle);
    assert.equal(await backend.controls.findControlAsync(front.target, earlier.handle, AbortSignal.timeout(TIMEOUT_MS)), null);
    assert.notEqual(await backend.controls.findControlAsync(front.target, later.handle, AbortSignal.timeout(TIMEOUT_MS)), null);
  });

  it("keeps a read's handles when a later read of the whole window fails before it finds the window", async () => {
    const front = await session.frontAsync();
    const earlier = await readSaveAsync(front);
    const other = { windowId: front.target.windowId, processId: front.target.processId + 1, imagePath: front.app.id };

    const error = await failureOfAsync(() => session.addon.readControls(other, null, TIMEOUT_MS));

    assert.match(String(error), /The window isn't the target's/);
    assert.notEqual(await backend.controls.findControlAsync(front.target, earlier.handle, AbortSignal.timeout(TIMEOUT_MS)), null);
  });

  it("refuses typing, a key press, a click and a drag as the person's input when the person's input count rises before the send, sending nothing, and sends them without it", async () => {
    const markPersonInput = seamOf(createRequire(import.meta.url)(WindowsBackend.addonFile));
    const front = await session.frontAsync();
    const { point: from } = await session.findMarkerAsync();
    const to = new DesktopPoint(from.x + 60, from.y + 40);
    session.window.send("focus box");
    assert.equal(await session.window.takeLineAsync("box focused ", TIMEOUT_MS), "box focused True");

    markPersonInput();
    const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "q", AbortSignal.timeout(TIMEOUT_MS)));
    markPersonInput();
    const pressed = await failureOfAsync(() => backend.input.pressKeyAsync(front.target, KeyName.Enter, [], AbortSignal.timeout(TIMEOUT_MS)));
    await backend.input.movePointerAsync(front.target, from, AbortSignal.timeout(TIMEOUT_MS));
    assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), from);
    markPersonInput();
    const clicked = await failureOfAsync(() => backend.input.clickAsync(front.target, from, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS)));
    assert.deepEqual(await backend.input.readPointerAsync(AbortSignal.timeout(TIMEOUT_MS)), from);
    markPersonInput();
    const dragged = await failureOfAsync(() => backend.input.dragAsync(front.target, from, to, PointerButton.Left, [], AbortSignal.timeout(TIMEOUT_MS)));

    for (const refusal of [typed, pressed, clicked, dragged])
      assert.deepEqual(refusal instanceof RefusalException ? [refusal.reason, refusal.isInputSent] : refusal, [RefusalReason.PhysicalInput, false]);
    assert.deepEqual(await session.enterBarrierAsync(session.window, front.target), []);
    await backend.input.typeTextAsync(front.target, "q", AbortSignal.timeout(TIMEOUT_MS));
    assert.match(await session.window.takeLineAsync("text ", TIMEOUT_MS), /q$/);
  });

  it("drops the person's input marked before a call the addon refuses before its send, so the next call sends", async () => {
    const markPersonInput = seamOf(createRequire(import.meta.url)(WindowsBackend.addonFile));
    const front = await session.frontAsync();
    const { point } = await session.findMarkerAsync();
    const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.target.app.id };
    session.window.send("focus box");
    assert.equal(await session.window.takeLineAsync("box focused ", TIMEOUT_MS), "box focused True");

    markPersonInput();
    assert.throws(() => session.addon.scroll(target, point.x, point.y, MAX_SCROLL_NOTCHES + 1, 0, []), { name: "RangeError" });
    await backend.input.typeTextAsync(front.target, "q", AbortSignal.timeout(TIMEOUT_MS));

    assert.match(await session.window.takeLineAsync("text ", TIMEOUT_MS), /q$/);
  });

  it("presses Escape, which closes the test window", async () => {
    await backend.input.pressKeyAsync((await session.frontAsync()).target, KeyName.Escape, [], AbortSignal.timeout(TIMEOUT_MS)).catch((error: unknown) => {
      assert.ok(error instanceof RefusalException && error.reason.value === "ForegroundChanged" && error.isInputSent, `Escape failed with ${String(error)}.`);
    });

    assert.equal(await session.window.exitAsync(TIMEOUT_MS), 0);
    assert.equal(await session.window.takeLineAsync("closed", TIMEOUT_MS), "closed");
  });

  it("closes a test window on the test's request, as after a failure, so it puts the pointer back", async () => {
    const other = new WindowsTestWindow();
    try {
      await other.takeLineAsync("ready", WindowsTestWindow.START_MS);

      assert.equal(await other.closeAsync(TIMEOUT_MS), 0);
      assert.equal(await other.takeLineAsync("closed", TIMEOUT_MS), "closed");
    }
    finally {
      await other.closeAsync(TIMEOUT_MS);
    }
  });

  it("brings a test window in front by minimizing and restoring it, with its frame and its marker where they were", async () => {
    await session.closeAsync();
    await session.openAsync();
    const usual = await session.frontAsync();
    const { point } = await session.findMarkerAsync();
    assert.equal(await session.closeAsync(), 0);

    const started = await session.openAsync({ RESTORE: "always" });
    const front = await session.frontAsync();

    assert.ok(started.includes("restored"), `The test window didn't minimize and restore itself; it reported ${JSON.stringify(started)}.`);
    session.window.send("iconic");
    assert.equal(await session.window.takeLineAsync("iconic ", TIMEOUT_MS), "iconic False");
    assert.deepEqual(front.frame, usual.frame);
    assert.deepEqual((await session.findMarkerAsync()).point, point);
  });

  it("names the window in front, with its process, class and title, when the test window doesn't report a line in time", async () => {
    await session.frontAsync();

    const failure = await failureOfAsync(() => session.window.takeLineAsync("never ", 1, 0));

    assert.ok(failure instanceof Error, `The line was taken: ${String(failure)}`);
    assert.match(failure.message, new RegExp(`, and the window in front is ${session.windowId} of process ${session.window.processId}, [^,]*\\\\powershell\\.exe, of class WindowsForms10\\.Window\\.[^,]+, titled "${session.window.title}"\\.$`, "i"));
  });

  it("lists another process's control inside the test window as a row of its app only, reading nothing it says or holds, and types into it", async () => {
    const child = new WindowsTestWindow("child-window.ps1");
    let host: WindowsTestWindow | undefined;
    try {
      const childId = WindowsDesktopSession.readId(await child.takeLineAsync("ready ", WindowsTestWindow.START_MS));
      host = new WindowsTestWindow();
      const hostId = WindowsDesktopSession.readId(await host.takeLineAsync("ready ", WindowsTestWindow.START_MS));
      host.send(`adopt ${childId}`);
      await host.takeLineAsync("adopted", TIMEOUT_MS);
      const front = await session.frontOfAsync(host, hostId);

      const target = { windowId: front.target.windowId, processId: front.target.processId, imagePath: front.app.id };
      const tree = await session.addon.readControls(target, null, TIMEOUT_MS);

      const listed = tree.controls.map(u => `${u.processId} ${u.controlType} "${u.name}"`).join("; ");
      const others = tree.controls.filter(u => u.processId === child.processId);
      assert.ok(others.length > 0, `No row of the child window's process is listed among ${listed}.`);
      for (const other of others) {
        assert.deepEqual([other.controlType, other.name, other.value], [0, "", null]);
        assert.deepEqual(tree.controls.filter(u => u.parentHandle === other.handle).map(u => u.name), [], `A control under the child window's row was read: ${listed}.`);
        assert.equal(await session.addon.findControl(target, other.handle, TIMEOUT_MS), null, `The child window's row ${other.handle} was found again.`);
      }
      assert.deepEqual(tree.controls.filter(u => u.name.includes("Other app's") || u.value?.includes("Other app's") === true).map(u => u.name), [], `The child window's text was read: ${listed}.`);

      const row = others[0];
      assert.ok(row !== undefined && row.width > 0, `The child window's row has no bounds: ${listed}.`);
      const scale = row.width / CHILD_WIDTH;
      await backend.input.clickAsync(front.target, new DesktopPoint(row.x + Math.round(CHILD_BOX_X * scale), row.y + Math.round(CHILD_BOX_Y * scale)), PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(TIMEOUT_MS));
      const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));

      assert.equal(typed, null, `The typing into the child window was refused: ${String(typed)}`);
      const text = (await child.takeLineAsync("text ", TIMEOUT_MS)).slice("text ".length);
      assert.ok([...text].some((u, i) => u === "a" && text.slice(0, i) + text.slice(i + 1) === CHILD_TEXT), `The child window's text box holds ${JSON.stringify(text)}, not its own text with an "a" typed in.`);
    }
    finally {
      await child.closeAsync(TIMEOUT_MS);
      await host?.closeAsync(TIMEOUT_MS);
    }
  });

  it("refuses typing while another process's window outside the target has the keyboard focus, sending nothing", async () => {
    const target = new WindowsTestWindow();
    let box: WindowsTestWindow | undefined;
    try {
      const front = await openSecondAsync(target);
      box = new WindowsTestWindow("password-window.ps1", { FOCUS: "user" });
      const boxFront = await frontPasswordWindowAsync(box);

      const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));

      assert.ok(typed instanceof RefusalException, `The typing wasn't refused: ${String(typed)}`);
      assert.deepEqual([typed.reason, typed.isInputSent], [RefusalReason.FocusOutsideTarget, false]);
      await backend.input.typeTextAsync(boxFront.target, "z", AbortSignal.timeout(TIMEOUT_MS));
      assert.equal(await box.takeLineAsync("user ", TIMEOUT_MS), "user z");
    }
    finally {
      await box?.closeAsync(TIMEOUT_MS);
      await target.closeAsync(TIMEOUT_MS);
    }
  });

  it("types a carriage return, a line feed or the pair of them as one Enter, and refuses the text after it", async () => {
    const typing = new WindowsTestWindow();
    try {
      const front = await openSecondAsync(typing);
      let text = "";
      for (const lineBreak of ["\r", "\n", "\r\n"]) {
        const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, `a${lineBreak}b`, AbortSignal.timeout(TIMEOUT_MS)));
        text += "a";

        assert.deepEqual(await typing.takeThroughAsync("enter", TIMEOUT_MS), [`text ${text}`, "enter"], `No Enter came for ${JSON.stringify(lineBreak)}.`);
        assert.ok(typed instanceof RefusalException, `The text after ${JSON.stringify(lineBreak)} wasn't refused: ${String(typed)}`);
        assert.deepEqual([typed.reason, typed.isInputSent], [RefusalReason.PasswordField, true]);
        assert.deepEqual(await session.enterBarrierAsync(typing, front.target), [], `More came after ${JSON.stringify(lineBreak)}.`);
      }
      const ended = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "a\r\n", AbortSignal.timeout(TIMEOUT_MS)));
      text += "a";

      assert.equal(ended, null, `Typing "a\\r\\n" wasn't sent whole: ${String(ended)}`);
      assert.deepEqual(await typing.takeThroughAsync("enter", TIMEOUT_MS), [`text ${text}`, "enter"]);
      assert.deepEqual(await session.enterBarrierAsync(typing, front.target), [], "More came after the ending \"\\r\\n\".");
    }
    finally {
      await typing.closeAsync(TIMEOUT_MS);
    }
  });

  it("types into and describes an app under a folder whose name holds \"İ\" and a Cherokee capital, which JavaScript lowers and Windows doesn't fold back", async () => {
    const folder = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "İᏣ-")));
    const program = path.join(folder, "powershell.exe");
    fs.copyFileSync(path.join(process.env["SystemRoot"] ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), program);
    const typing = new WindowsTestWindow("test-window.ps1", {}, program);
    try {
      const front = await openSecondAsync(typing);

      assert.equal(front.target.app.id, AppIdentity.ofWindowsPath(program).id);
      assert.ok(front.target.app.id.includes("İᏣ-"), front.target.app.id);
      await backend.input.typeTextAsync(front.target, "q", AbortSignal.timeout(TIMEOUT_MS));
      assert.match(await typing.takeLineAsync("text ", TIMEOUT_MS), /q$/);
      assert.notEqual(await backend.apps.describeAppAsync(front.target.app, 64, AbortSignal.timeout(TIMEOUT_MS)), null);
    }
    finally {
      await typing.closeAsync(TIMEOUT_MS);
      fs.rmSync(folder, { recursive: true, force: true, maxRetries: 10 });
    }
  });

  it("refuses typing and a key press in a WPF password box, sending nothing", async () => {
    const box = new WindowsTestWindow("password-window.ps1");
    try {
      const front = await frontPasswordWindowAsync(box);

      const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));
      const pressed = await failureOfAsync(() => backend.input.pressKeyAsync(front.target, KeyName.Escape, [], AbortSignal.timeout(TIMEOUT_MS)));

      for (const refusal of [typed, pressed]) {
        assert.ok(refusal instanceof RefusalException, `The input wasn't refused: ${String(refusal)}`);
        assert.deepEqual([refusal.reason, refusal.isInputSent], [RefusalReason.PasswordField, false]);
      }
      assert.deepEqual(await session.clickBarrierAsync(box, front), []);
    }
    finally {
      await box.closeAsync(TIMEOUT_MS);
    }
  });

  it("types a user name and a Tab, refuses the text after the Tab, and refuses it again in the WPF password box the Tab moves to", async () => {
    const box = new WindowsTestWindow("password-window.ps1", { FOCUS: "user" });
    try {
      const front = await frontPasswordWindowAsync(box);

      const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "ada\thunter2", AbortSignal.timeout(TIMEOUT_MS)));
      const moved = await box.takeThroughAsync("focus password", TIMEOUT_MS);
      assert.deepEqual([moved.filter(u => u.startsWith("user ")).at(-1), moved.filter(u => u.startsWith("secret "))], ["user ada", []]);
      const rest = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "hunter2", AbortSignal.timeout(TIMEOUT_MS)));

      assert.ok(typed instanceof RefusalException, `The typing wasn't refused: ${String(typed)}`);
      assert.deepEqual([typed.reason, typed.isInputSent], [RefusalReason.PasswordField, true]);
      assert.ok(rest instanceof RefusalException, `The rest wasn't refused: ${String(rest)}`);
      assert.deepEqual([rest.reason, rest.isInputSent], [RefusalReason.PasswordField, false]);
      assert.deepEqual(await session.clickBarrierAsync(box, front), []);
    }
    finally {
      await box.closeAsync(TIMEOUT_MS);
    }
  });

  it("refuses typing into a window whose thread is held past the focus budget, as an unknown focus, sending nothing", async () => {
    const box = new WindowsTestWindow("password-window.ps1", { FOCUS: "user" });
    try {
      const front = await frontPasswordWindowAsync(box);
      box.send("hold");
      await box.takeLineAsync("held", TIMEOUT_MS);

      const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "a", AbortSignal.timeout(TIMEOUT_MS)));
      box.send("release");
      await box.takeLineAsync("released", TIMEOUT_MS);

      assert.ok(typed instanceof RefusalException, `The typing wasn't refused: ${String(typed)}`);
      assert.deepEqual([typed.reason, typed.isInputSent], [RefusalReason.FocusUnknown, false]);
      await backend.controls.readControlsAsync(front.target, null, AbortSignal.timeout(TIMEOUT_MS));
      await backend.input.typeTextAsync(front.target, "z", AbortSignal.timeout(TIMEOUT_MS));
      assert.equal(await box.takeLineAsync("user ", TIMEOUT_MS), "user z");
    }
    finally {
      await box.closeAsync(TIMEOUT_MS);
    }
  });

  it("refuses a pointer move from a File Explorer folder window to the desktop that File Explorer's process draws, sending nothing", async t => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "noldova-computer-use-"));
    const known = new Set(session.addon.listWindows().windows.map(u => u.windowId));
    const pointer = WindowsDesktopSession.readPointer();
    let opened: IWindowsStackedWindowJson | undefined;
    try {
      WindowsDesktopSession.runPowerShell(`(New-Object -ComObject Shell.Application).Open("${folder}")`);
      for (const deadline = Date.now() + TIMEOUT_MS; opened === undefined && Date.now() < deadline; await delay(POLL_MS))
        opened = session.addon.listWindows().windows.find(u => u.className === FOLDER_WINDOW_CLASS && !known.has(u.windowId));
      assert.ok(opened !== undefined, "No File Explorer folder window opened.");
      const handle = opened.windowId;
      await session.bringToFrontAsync(handle);
      const front = await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS));
      assert.ok(front !== null && front.target.windowId === handle, `The window in front is ${front?.appName ?? "none"}'s, not the test's File Explorer folder window ${handle}.`);
      const [desktop = "0", desktopId = "0"] = WindowsDesktopSession.runPowerShell(`${WindowsDesktopSession.USER32}; [uint32] $id = 0; $desktop = [NoldovaNativeTest.User32]::GetShellWindow(); ` +
        `[NoldovaNativeTest.User32]::GetWindowThreadProcessId($desktop, [ref] $id) | Out-Null; "$desktop $id"`).split(" ");
      const desktopProcess = Number(desktopId);
      t.diagnostic(`the folder window ${handle} is of process ${front.target.processId}, the desktop window ${desktop} of process ${desktopProcess}`);
      assert.ok(desktopProcess > 0, `The desktop window ${desktop}'s process couldn't be read.`);
      if (desktopProcess !== front.target.processId) {
        t.skip("File Explorer runs its folder windows in a process of their own here, so the check by process already refuses the desktop.");
        return;
      }

      const stacked = session.addon.listWindows().windows;
      const at = WindowsDesktopSession.findDesktopSpot(stacked, (await backend.displays.listDisplaysAsync(AbortSignal.timeout(TIMEOUT_MS))).find(u => u.isPrimary));
      assert.ok(at !== undefined, `No spot of the primary display shows the desktop uncovered; the windows on top are ${stacked.slice(0, 8).map(u => `${u.className} ${u.width}x${u.height} at ${u.x}, ${u.y}`).join("; ")}.`);
      t.diagnostic(`moving the pointer to the desktop at ${at.x}, ${at.y}`);
      const refusal = await failureOfAsync(() => backend.input.movePointerAsync(front.target, at, AbortSignal.timeout(TIMEOUT_MS)));

      assert.ok(refusal instanceof RefusalException, `The move wasn't refused: ${String(refusal)}.`);
      assert.deepEqual([refusal.reason, refusal.isInputSent], [RefusalReason.OtherWindowAtPoint, false]);
      assert.equal(WindowsDesktopSession.readPointer(), pointer, "The pointer moved.");
    } finally {
      if (opened !== undefined)
        WindowsDesktopSession.runPowerShell(`(New-Object -ComObject Shell.Application).Windows() | Where-Object { $_.HWND -eq ${opened.windowId} } | ForEach-Object { $_.Quit() }`);
      const [x = "0", y = "0"] = pointer.split(" ");
      WindowsDesktopSession.runPowerShell(`${WindowsDesktopSession.USER32}; [NoldovaNativeTest.User32]::SetCursorPos(${x}, ${y}) | Out-Null`);
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  it("types a digit into Calculator, a UWP app whose content runs in another process than the window around it", async () => {
    const readCalculator = (): number => {
      const listed = execFileSync("tasklist.exe", ["/FI", `IMAGENAME eq ${CALCULATOR}`, "/FO", "CSV", "/NH"], { timeout: TIMEOUT_MS }).toString();

      return Number(/^"CalculatorApp\.exe","(\d+)"/im.exec(listed)?.[1] ?? 0);
    };
    assert.equal(readCalculator(), 0, "Calculator already runs, so the test can't start its own.");
    const known = new Set(session.addon.listWindows().windows.map(u => u.windowId));
    let calculator = 0;
    let started: Error | null = null;
    try {
      spawn("calc.exe", [], { stdio: "ignore" }).once("error", (error: Error) => {
        started = error;
      }).unref();
      let frame: IWindowsStackedWindowJson | undefined;
      for (const deadline = Date.now() + TIMEOUT_MS; started === null && (calculator === 0 || frame === undefined) && Date.now() < deadline; await delay(POLL_MS)) {
        calculator = readCalculator();
        frame = session.addon.listWindows().windows.find(u => u.className === FRAME_WINDOW_CLASS && !known.has(u.windowId));
      }
      assert.ok(calculator > 0 && frame !== undefined, `Calculator didn't start: its process is ${calculator}, its window ${frame?.windowId ?? "none"}, its start ${String(started)}.`);
      await session.bringToFrontAsync(frame.windowId);
      const front = await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS));
      assert.ok(front !== null && front.target.windowId === frame.windowId, `The window in front is ${front?.appName ?? "none"}'s, not Calculator's window ${frame.windowId}.`);

      const typed = await failureOfAsync(() => backend.input.typeTextAsync(front.target, "7", AbortSignal.timeout(TIMEOUT_MS)));

      assert.equal(typed, null, `The digit wasn't typed into Calculator, process ${calculator}: ${String(typed)}`);
      const readDisplay = (): string => WindowsDesktopSession.runPowerShell(`Add-Type -AssemblyName UIAutomationClient; $results = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr] ${Number(frame.windowId)}).FindFirst([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, "CalculatorResults"))); if ($null -ne $results) { $results.Current.Name }`);
      let display = readDisplay();
      for (const deadline = Date.now() + TIMEOUT_MS; !DIGIT_SHOWN.test(display) && Date.now() < deadline; display = readDisplay())
        await delay(POLL_MS);
      assert.match(display, DIGIT_SHOWN, `Calculator's display doesn't show the digit: ${JSON.stringify(display)}.`);
    } finally {
      if (calculator > 0) {
        try {
          execFileSync("taskkill.exe", ["/F", "/PID", String(calculator)], { stdio: "ignore", timeout: TIMEOUT_MS });
        } catch (error: unknown) {
          if (!(error instanceof Error && "status" in error && error.status === TASKKILL_NOT_FOUND))
            throw error;
        }
        for (const deadline = Date.now() + TIMEOUT_MS; readCalculator() !== 0 && Date.now() < deadline;)
          await delay(POLL_MS);
        assert.equal(readCalculator(), 0, `Calculator, process ${calculator}, is still running.`);
      }
    }
  });
});
