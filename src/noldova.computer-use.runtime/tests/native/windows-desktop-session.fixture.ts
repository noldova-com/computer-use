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
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay, setImmediate } from "node:timers/promises";

import { ClickCount, DesktopPoint, type DesktopRect, type Display, KeyName, PointerButton, type StackedWindow, type WindowImage, type WindowInfo } from "@noldova/computer-use.runtime";
import { type IWindowsDesktopApi, type IWindowsStackedWindowJson, WindowsBackend } from "@noldova/computer-use.runtime/windows";

import type { IPointerSample } from "./glide-recording.fixture.ts";
import { WindowsTestWindow } from "./windows-test-window.fixture.ts";

export class TestWindowListing {
  public readonly listed: StackedWindow;
  public readonly windows: readonly StackedWindow[];

  public constructor(windows: readonly StackedWindow[], listed: StackedWindow) {
    this.windows = windows;
    this.listed = listed;
  }
}

export class TestWindowCapture {
  public readonly image: WindowImage;
  public readonly listed: StackedWindow;
  public readonly rgb: Uint8Array;

  public constructor(listed: StackedWindow, image: WindowImage, rgb: Uint8Array) {
    this.listed = listed;
    this.image = image;
    this.rgb = rgb;
  }
}

export class PixelSpot {
  public readonly x: number;
  public readonly y: number;

  public constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class ColourScan {
  public readonly common: string;
  public readonly found: readonly PixelSpot[];

  public constructor(found: readonly PixelSpot[], common: string) {
    this.found = found;
    this.common = common;
  }
}

export class MarkerSpot {
  public readonly pixels: number;
  public readonly point: DesktopPoint;

  public constructor(point: DesktopPoint, pixels: number) {
    this.point = point;
    this.pixels = pixels;
  }
}

export class PointerRecording {
  public readonly error: unknown;
  public readonly samples: readonly IPointerSample[];

  public constructor(samples: readonly IPointerSample[], error: unknown) {
    this.samples = samples;
    this.error = error;
  }
}

export class RgbColour {
  public readonly blue: number;
  public readonly green: number;
  public readonly red: number;

  public constructor(red: number, green: number, blue: number) {
    this.red = red;
    this.green = green;
    this.blue = blue;
  }
}

export class WindowsDesktopSession {
  public static readonly TIMEOUT_MS: number = 10_000;
  public static readonly EDGE: number = 8;
  public static readonly MARKER: RgbColour = new RgbColour(255, 0, 255);
  public static readonly POWERSHELL_MS: number = 60_000;
  public static readonly USER32: string = `Add-Type -Namespace NoldovaNativeTest -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern IntPtr GetShellWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr window);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
[DllImport("user32.dll")] public static extern bool GetCursorPos(out System.Drawing.Point point);
[DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
[DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(System.Drawing.Point point);
'@ -ReferencedAssemblies System.Drawing
[NoldovaNativeTest.User32]::SetProcessDPIAware() | Out-Null`;

  public static readonly POLL_MS: number = 100;

  private static readonly DESKTOP_CLASSES: readonly string[] = ["Progman", "WorkerW"];
  private static readonly DESKTOP_MARGIN: number = 120;
  private static readonly DESKTOP_STEP: number = 40;
  private static readonly FAR_GLIDE: number = 620;
  private static readonly AFTER_INPUT_MS: number = 100;
  private static readonly ARRIVAL_MS: number = 500;

  public readonly backend: WindowsBackend = WindowsBackend.load();

  private current: WindowsTestWindow | null = null;
  private currentId: string = "";
  private loaded: IWindowsDesktopApi | null = null;

  public get addon(): IWindowsDesktopApi {
    if (this.loaded === null) {
      const addon: IWindowsDesktopApi = createRequire(import.meta.url)(WindowsBackend.addonFile);
      this.loaded = addon;
    }

    return this.loaded;
  }

  public get window(): WindowsTestWindow {
    assert.ok(this.current !== null, "No test window is open.");

    return this.current;
  }

  public get windowId(): string {
    return this.currentId;
  }

  public static readRgb(bgra: Uint8Array): Uint8Array {
    const rgb = new Uint8Array(bgra.length / 4 * 3);
    for (let from = 0, to = 0; from < bgra.length; from += 4, to += 3)
      rgb.set([bgra[from + 2] ?? 0, bgra[from + 1] ?? 0, bgra[from] ?? 0], to);

    return rgb;
  }

  public static runPowerShell(command: string): string {
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(command, "utf16le").toString("base64")], { timeout: WindowsDesktopSession.POWERSHELL_MS }).toString().trim();
  }

  public static readPointer(): string {
    return WindowsDesktopSession.runPowerShell(`${WindowsDesktopSession.USER32}; $point = New-Object System.Drawing.Point; [NoldovaNativeTest.User32]::GetCursorPos([ref] $point) | Out-Null; "$($point.X) $($point.Y)"`);
  }

  public static readButtons(): string {
    return WindowsDesktopSession.runPowerShell("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Control]::MouseButtons");
  }

  public static isInside(frame: DesktopRect, point: DesktopPoint): boolean {
    const edge = WindowsDesktopSession.EDGE;

    return point.x >= frame.x + edge && point.x < frame.x + frame.width - edge && point.y >= frame.y + edge && point.y < frame.y + frame.height - edge;
  }

  public static counterMs(): number {
    return Number(process.hrtime.bigint()) / 1_000_000;
  }

  public static readId(ready: string): string {
    return ready.split(" ")[1] ?? "";
  }

  public static scan(image: WindowImage, rgb: Uint8Array, colour: RgbColour | ((red: number, green: number, blue: number) => boolean)): ColourScan {
    const found: PixelSpot[] = [];
    const colours = new Map<string, number>();
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++) {
        const at = (y * image.width + x) * 3;
        const [red = 0, green = 0, blue = 0] = rgb.subarray(at, at + 3);
        colours.set(`${red},${green},${blue}`, (colours.get(`${red},${green},${blue}`) ?? 0) + 1);
        if (typeof colour === "function" ? colour(red, green, blue) : red === colour.red && green === colour.green && blue === colour.blue)
          found.push(new PixelSpot(x, y));
      }

    return new ColourScan(found, [...colours].sort((a, b) => b[1] - a[1]).slice(0, 5).map(t => `${t[0]} ×${t[1]}`).join("; "));
  }

  public static keep(image: WindowImage, rgb: Uint8Array, name: string): void {
    const folder = path.join(process.cwd(), "_build", "native-captures");
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, name), Buffer.concat([Buffer.from(`P6 ${image.width} ${image.height} 255\n`), Buffer.from(rgb)]));
  }

  public static findDesktopSpot(windows: readonly IWindowsStackedWindowJson[], display: Display | undefined): DesktopPoint | undefined {
    if (display === undefined)
      return undefined;

    const margin = WindowsDesktopSession.DESKTOP_MARGIN;
    for (let x = display.x + display.width - margin; x >= display.x + margin; x -= WindowsDesktopSession.DESKTOP_STEP)
      for (let y = display.y + margin; y < display.y + display.height - margin; y += WindowsDesktopSession.DESKTOP_STEP) {
        const top = windows.find(u => x >= u.x && x < u.x + u.width && y >= u.y && y < u.y + u.height);
        if (top !== undefined && WindowsDesktopSession.DESKTOP_CLASSES.includes(top.className))
          return new DesktopPoint(x, y);
      }

    return undefined;
  }

  public async openAsync(values: Readonly<Record<string, string | number>> = {}): Promise<readonly string[]> {
    this.current = new WindowsTestWindow("test-window.ps1", values);
    const started = await this.current.takeThroughAsync("ready ", WindowsTestWindow.START_MS);
    this.currentId = WindowsDesktopSession.readId(started.at(-1) ?? "");

    return started;
  }

  public async closeAsync(): Promise<number | null> {
    return await this.window.closeAsync(WindowsDesktopSession.TIMEOUT_MS);
  }

  public async reopenAsync(): Promise<readonly string[]> {
    const left = this.window.takePending();
    await this.closeAsync();
    await this.openAsync();

    return left;
  }

  public async frontAsync(): Promise<WindowInfo> {
    const front = await this.backend.windows.getForegroundWindowAsync(AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS));
    assert.ok(front !== null, "No window is in front.");
    assert.equal(front.target.processId, this.window.processId, `The window in front belongs to ${front.appName}, not to the test window.`);
    assert.equal(front.target.windowId, this.currentId, `The window in front is window ${front.target.windowId} of the test's process, not the test window ${this.currentId}.`);

    return front;
  }

  public async frontOfAsync(other: WindowsTestWindow, otherId: string): Promise<WindowInfo> {
    const front = await this.backend.windows.getForegroundWindowAsync(AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS));
    assert.ok(front !== null && front.target.processId === other.processId && front.target.windowId === otherId, `The window in front is ${front?.appName ?? "none"}, not the test's window ${otherId}.`);

    return front;
  }

  public async listTestWindowAsync(): Promise<TestWindowListing> {
    const { windows } = await this.backend.windows.listStackAsync(AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS));
    const listed = windows.find(t => t.windowId === this.currentId);
    assert.ok(listed !== undefined, `The test window ${this.currentId} isn't among the ${windows.length} windows listed.`);

    return new TestWindowListing(windows, listed);
  }

  public async captureTestWindowAsync(): Promise<TestWindowCapture> {
    const { listed } = await this.listTestWindowAsync();
    const image = await this.backend.capture.captureWindowAsync(listed, AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS));
    assert.ok(image !== null, `The test window at ${JSON.stringify(listed.frame)} couldn't be captured.`);

    return new TestWindowCapture(listed, image, WindowsDesktopSession.readRgb(image.bgra));
  }

  public async findMarkerAsync(): Promise<MarkerSpot> {
    const { listed, image, rgb } = await this.captureTestWindowAsync();
    const { found, common } = WindowsDesktopSession.scan(image, rgb, WindowsDesktopSession.MARKER);
    if (found.length === 0)
      WindowsDesktopSession.keep(image, rgb, "test-window.ppm");
    const frame = listed.frame;
    assert.ok(found.length > 0, `The test window's image of ${image.width} by ${image.height} pixels over ${JSON.stringify(frame)} shows no marker; its commonest colours are ${common}.`);
    const centre = found[Math.floor(found.length / 2)] ?? new PixelSpot(0, 0);

    return new MarkerSpot(
      new DesktopPoint(frame.x + Math.floor((centre.x + 0.5) * frame.width / image.width), frame.y + Math.floor((centre.y + 0.5) * frame.height / image.height)),
      found.length
    );
  }

  public async enterBarrierAsync(window: WindowsTestWindow, target: WindowInfo["target"]): Promise<readonly string[]> {
    await this.backend.input.pressKeyAsync(target, KeyName.Enter, [], AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS));

    return (await window.takeThroughAsync("enter", WindowsDesktopSession.TIMEOUT_MS)).slice(0, -1);
  }

  public async clickBarrierAsync(window: WindowsTestWindow, front: WindowInfo): Promise<readonly string[]> {
    const point = new DesktopPoint(front.frame.x + Math.floor(front.frame.width / 2), front.frame.y + front.frame.height - 5 * WindowsDesktopSession.EDGE);
    assert.ok(WindowsDesktopSession.isInside(front.frame, point), `The barrier's click at ${point.x}, ${point.y} lies too near the window's edge.`);
    await this.backend.input.clickAsync(front.target, point, PointerButton.Left, ClickCount.Single, [], AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS));

    return (await window.takeThroughAsync("click", WindowsDesktopSession.TIMEOUT_MS)).slice(0, -1);
  }

  public async recordAsync(from: DesktopPoint, send: () => Promise<void>, to: DesktopPoint | null, onLeave: () => void = () => undefined): Promise<PointerRecording> {
    const samples: IPointerSample[] = [];
    let endedMs = Infinity;
    let error: unknown = null;
    let hasLeft = false;
    const began = performance.now();
    const sent = send().catch((reason: unknown) => {
      error = reason;
    }).finally(() => {
      endedMs = performance.now();
    });
    for (;;) {
      const isAfterInput = performance.now() >= endedMs;
      const pointer = this.addon.readPointer();
      const atMs = performance.now();
      samples.push({ atMs: atMs - began, x: pointer.x, y: pointer.y });
      if (!hasLeft && (pointer.x !== from.x || pointer.y !== from.y)) {
        hasLeft = true;
        onLeave();
      }
      const isArrived = to !== null && pointer.x === to.x && pointer.y === to.y;
      if (isAfterInput && (isArrived || atMs - endedMs >= (to === null ? WindowsDesktopSession.AFTER_INPUT_MS : WindowsDesktopSession.ARRIVAL_MS)))
        break;
      await setImmediate();
    }
    await sent;

    return new PointerRecording(samples, error);
  }

  public async bringToFrontAsync(handle: string): Promise<void> {
    WindowsDesktopSession.runPowerShell(`${WindowsDesktopSession.USER32}; $front = [NoldovaNativeTest.User32]::GetForegroundWindow(); $id = 0; $thread = [NoldovaNativeTest.User32]::GetWindowThreadProcessId($front, [ref] $id); ` +
      `$own = [NoldovaNativeTest.User32]::GetCurrentThreadId(); [NoldovaNativeTest.User32]::AttachThreadInput($own, $thread, $true) | Out-Null; ` +
      `[NoldovaNativeTest.User32]::BringWindowToTop([IntPtr]${handle}) | Out-Null; [NoldovaNativeTest.User32]::SetForegroundWindow([IntPtr]${handle}) | Out-Null; ` +
      `[NoldovaNativeTest.User32]::AttachThreadInput($own, $thread, $false) | Out-Null`);
    for (const deadline = Date.now() + WindowsDesktopSession.TIMEOUT_MS; this.addon.getForegroundWindow()?.windowId !== handle && Date.now() < deadline;)
      await delay(WindowsDesktopSession.POLL_MS);
  }

  public async warpAsync(point: DesktopPoint): Promise<void> {
    this.window.send(`warp ${point.x} ${point.y}`);
    await this.window.takeLineAsync("warped ", WindowsDesktopSession.TIMEOUT_MS);
  }

  public async farFromAsync(point: DesktopPoint): Promise<DesktopPoint> {
    const display = (await this.backend.displays.listDisplaysAsync(AbortSignal.timeout(WindowsDesktopSession.TIMEOUT_MS))).find(t => t.isPrimary);
    assert.ok(display !== undefined, "No primary display is listed.");
    const isRightFree = point.x + WindowsDesktopSession.FAR_GLIDE < display.x + display.width - WindowsDesktopSession.EDGE;

    return new DesktopPoint(isRightFree ? point.x + WindowsDesktopSession.FAR_GLIDE : point.x - WindowsDesktopSession.FAR_GLIDE, point.y);
  }
}
