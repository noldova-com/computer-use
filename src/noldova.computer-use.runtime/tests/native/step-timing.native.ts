/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IOperatingSystemBackend, RuntimePart, type StackedWindow, type WindowInfo } from "@noldova/computer-use.runtime";
import { PermissionOption, ToolContentKind, ToolFailureException, type ToolResult } from "@noldova/desktop.runtime";
import { MacBackend, MacCodeSignProgram, MacScreenCaptureProgram, MacScriptProcess } from "@noldova/computer-use.runtime/macos";
import { type IWindowsDesktopApi, WindowsBackend } from "@noldova/computer-use.runtime/windows";

import { ProgramStarterDouble } from "../doubles/program-starter-double.fixture.ts";
import { RecordingPermissionCenter } from "../doubles/recording-permission-center.fixture.ts";
import { RuntimePartContextDouble } from "../doubles/runtime-part-context-double.fixture.ts";
import { PngImage } from "../services/png-image.fixture.ts";

import { MacTestWindow } from "./mac-test-window.fixture.ts";
import { WindowsTestWindow } from "./windows-test-window.fixture.ts";

const STEPS = 24;
const WARM_UP_STEPS = 2;
const TIMEOUT_MS = 10_000;
const SUMMARY = "To measure a step's time.";
const SCREENSHOT = "screenshot";
const CLICK = "click";
const BACKEND_PARTS: readonly string[] = ["apps", "displays", "windows", "capture", "input", "physicalInput", "permissions"];
const GLIDE_CALLS: readonly string[] = ["addon.glidePointer", "script.glidePointer"];
const EDGE = 8;

interface ITestWindow {
  readonly processId: number;
  readonly windowId: string;
  takeLineAsync(prefix: string, timeoutMs: number): Promise<string>;
  closeAsync(timeoutMs: number): Promise<unknown>;
}

interface IPlatform {
  readonly blankOffset: { readonly x: number; readonly y: number };
  readonly reportsEveryClick: boolean;
  readonly appStarts: readonly (() => OrdinaryApp)[];
  openBackend(clock: StepClock, starter: ProgramStarterDouble): IOperatingSystemBackend & { closeAsync?(): Promise<void> };
  openWindowAsync(): Promise<ITestWindow>;
}

interface IStepTimes {
  readonly totals: ReadonlyMap<string, number>;
  readonly calls: ReadonlyMap<string, readonly number[]>;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
}

class OrdinaryApp {
  private static readonly MAC_LAUNCHER: string = `ObjC.import("AppKit");
function run(argv) {
  if ($.NSRunningApplication.runningApplicationsWithBundleIdentifier(argv[1]).count > 0)
    return "running";
  const configuration = $.NSMutableDictionary.dictionary;
  configuration.setObjectForKey($(argv.slice(2)), $("NSWorkspaceLaunchConfigurationArguments"));
  const app = $.NSWorkspace.sharedWorkspace.launchApplicationAtURLOptionsConfigurationError($.NSURL.fileURLWithPath(argv[0]), 0x00080000 | 0x00000200, configuration, null);
  return app.isNil() ? "0" : String(app.processIdentifier);
}`;
  private static readonly NO_PROCESS: string = "ESRCH";
  private static readonly TASKKILL_NO_PROCESS: number = 128;
  private static readonly ENDED_POLL_MS: number = 100;

  public readonly appId: string;
  public readonly processId: number;

  private constructor(appId: string, processId: number) {
    this.appId = appId;
    this.processId = processId;
  }

  public static start(executable: string): OrdinaryApp {
    const name = path.basename(executable);
    const listed = execFileSync("tasklist.exe", ["/FI", `IMAGENAME eq ${name}`, "/FO", "CSV", "/NH"], { timeout: TIMEOUT_MS }).toString();
    assert.ok(!listed.toLowerCase().includes(`"${name.toLowerCase()}"`), `${name} already runs, so the test can't start its own.`);
    const child = spawn(executable, [], { stdio: "ignore" });
    child.once("error", () => undefined);
    child.unref();
    assert.ok(child.pid !== undefined, `${name} didn't start.`);

    return new OrdinaryApp(executable, child.pid);
  }

  public static launch(appId: string, bundle: string, parameters: readonly string[]): OrdinaryApp {
    const id = execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", OrdinaryApp.MAC_LAUNCHER, bundle, appId, ...parameters], { timeout: TIMEOUT_MS }).toString().trim();
    assert.notEqual(id, "running", `${appId} already runs, so the test can't start its own.`);
    assert.ok(Number(id) > 0, `${appId} didn't start: ${id}.`);

    return new OrdinaryApp(appId, Number(id));
  }

  private static isEnded(error: unknown): boolean {
    if (!(error instanceof Error))
      return false;

    return ("code" in error && error.code === OrdinaryApp.NO_PROCESS) || ("status" in error && error.status === OrdinaryApp.TASKKILL_NO_PROCESS);
  }

  public isOf(window: StackedWindow): boolean {
    return window.app?.id.toLowerCase() === this.appId.toLowerCase();
  }

  public async endAsync(): Promise<void> {
    try {
      if (process.platform === "win32")
        execFileSync("taskkill.exe", ["/T", "/F", "/PID", String(this.processId)], { stdio: "ignore", timeout: TIMEOUT_MS });
      else
        process.kill(this.processId, "SIGKILL");
    } catch (error) {
      if (!OrdinaryApp.isEnded(error))
        throw error;
    }
    for (const deadline = performance.now() + TIMEOUT_MS; this.isRunning() && performance.now() < deadline;)
      await delay(OrdinaryApp.ENDED_POLL_MS);

    assert.equal(this.isRunning(), false, `The app ${this.appId}, process ${this.processId}, is still running.`);
  }

  public isRunning(): boolean {
    try {
      process.kill(this.processId, 0);
      return true;
    } catch (error) {
      if (OrdinaryApp.isEnded(error))
        return false;
      throw error;
    }
  }
}

class StepClock {
  private phase: string = "";
  private readonly calls: Map<string, number[]> = new Map();

  public begin(phase: string): void {
    this.phase = phase;
  }

  public timed<T extends object>(part: string, object: T, nameOf: (method: string, parameters: readonly unknown[]) => string = t => t): T {
    const target: T = { ...object };

    return new Proxy(target, {
      get: (_, property) => {
        const value: unknown = Reflect.get(object, property, object);
        if (typeof value !== "function" || typeof property !== "string")
          return value;

        return (...parameters: unknown[]): unknown => {
          const key = `${part}.${nameOf(property, parameters)}`;
          const start = performance.now();
          const result: unknown = Reflect.apply(value, object, parameters);
          if (result instanceof Promise)
            return result.finally(() => this.add(key, performance.now() - start));
          this.add(key, performance.now() - start);

          return result;
        };
      }
    });
  }

  public add(key: string, ms: number): void {
    const name = `${this.phase} ${key}`;
    this.calls.set(name, [...this.calls.get(name) ?? [], ms]);
  }

  public take(): ReadonlyMap<string, readonly number[]> {
    const taken = new Map(this.calls);
    this.calls.clear();

    return taken;
  }
}

function percentile(values: readonly number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)] ?? 0;
}

function sum(values: readonly number[] | undefined): number {
  return (values ?? []).reduce((total, t) => total + t, 0);
}

function isMarker(red: number, green: number, blue: number): boolean {
  return red > 180 && green < 100 && blue > 180;
}

function loadWindowsAddon(): IWindowsDesktopApi {
  const addon: IWindowsDesktopApi = createRequire(import.meta.url)(WindowsBackend.addonFile);

  return addon;
}

const WINDOWS: IPlatform = {
  blankOffset: { x: -300, y: 50 },
  reportsEveryClick: false,
  openBackend: clock => new WindowsBackend(clock.timed("addon", loadWindowsAddon())),
  appStarts: ["charmap.exe", "winver.exe"].map(t => () => OrdinaryApp.start(path.join(process.env["SystemRoot"] ?? "C:\\Windows", "System32", t))),
  openWindowAsync: async () => {
    const window = new WindowsTestWindow();
    const windowId = (await window.takeLineAsync("ready ", WindowsTestWindow.START_MS)).split(" ")[1] ?? "";

    return { processId: window.processId, windowId, takeLineAsync: async (prefix, timeoutMs) => await window.takeLineAsync(prefix, timeoutMs), closeAsync: async timeoutMs => await window.closeAsync(timeoutMs) };
  }
};

const MAC: IPlatform = {
  blankOffset: { x: -84, y: 236 },
  reportsEveryClick: true,
  openBackend: (clock, starter) => new MacBackend(
    clock.timed("script", new MacScriptProcess(starter, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], TIMEOUT_MS), (method, parameters) => (method === "callAsync" ? String(parameters[0]) : method)),
    clock.timed("screencapture", new MacScreenCaptureProgram(starter, "/usr/sbin/screencapture", [], TIMEOUT_MS, path.join(os.tmpdir(), "noldova-computer-use-captures"))),
    new MacCodeSignProgram(starter, "/usr/bin/codesign", [], TIMEOUT_MS),
    MacBackend.hostPathOf(process.execPath),
    path.join(os.tmpdir(), "noldova-computer-use-stops"),
    starter.log
  ),
  appStarts: [
    () => OrdinaryApp.launch("com.apple.textedit", "/System/Applications/TextEdit.app", ["-ApplePersistenceIgnoreState", "YES", "-NSShowAppCentricOpenPanelInsteadOfUntitledFile", "NO"]),
    () => OrdinaryApp.launch("com.apple.calculator", "/System/Applications/Calculator.app", ["-ApplePersistenceIgnoreState", "YES"])
  ],
  openWindowAsync: async () => {
    const window = await MacTestWindow.openAsync();
    await window.takeLineAsync("ready ", TIMEOUT_MS);

    return { processId: window.pid, windowId: String(window.windowNumber), takeLineAsync: async (prefix, timeoutMs) => await window.takeLineAsync(prefix, timeoutMs), closeAsync: async timeoutMs => await window.closeAsync(timeoutMs) };
  }
};

const PLATFORM = process.platform === "win32" ? WINDOWS : MAC;

describe("a step's time, end to end", { skip: process.platform !== "win32" && process.platform !== "darwin" ? "A step is timed on the Windows and macOS desktops only." : false }, () => {
  const clock = new StepClock();
  const starter = new ProgramStarterDouble();
  const backend = PLATFORM.openBackend(clock, starter);
  const apps: OrdinaryApp[] = [];
  let window: ITestWindow | undefined;

  async function frontAsync(): Promise<WindowInfo> {
    const front = await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(TIMEOUT_MS));
    assert.ok(front !== null, "No window is in front.");
    assert.equal(front.target.processId, window?.processId, `The window in front belongs to ${front.appName}, not to the test window.`);
    assert.equal(front.target.windowId, window?.windowId, `The window in front is ${front.target.windowId}, not the test window ${window?.windowId ?? ""}.`);

    return front;
  }

  function findMarker(image: PngImage): { readonly x: number; readonly y: number } {
    const found: { x: number; y: number }[] = [];
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++) {
        const [red = 0, green = 0, blue = 0] = image.pixel(x, y);
        if (isMarker(red, green, blue))
          found.push({ x, y });
      }
    assert.ok(found.length > 0, `The ${image.width} by ${image.height} screenshot shows no marker.`);
    const xs = found.map(u => u.x);
    const ys = found.map(u => u.y);

    return { x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) };
  }

  function report(t: { diagnostic(message: string): void }, steps: readonly IStepTimes[]): void {
    const row = (name: string, values: readonly number[], calls = ""): void => t.diagnostic(`| ${name} | ${calls} | ${percentile(values, 0.5).toFixed(1)} | ${percentile(values, 0.95).toFixed(1)} |`);
    t.diagnostic(`${STEPS} steps on ${os.type()} ${os.release()} ${os.arch()}, ${os.availableParallelism()} threads, after ${WARM_UP_STEPS} warm-up steps; ms a step`);
    t.diagnostic("| part | calls a step | median | p95 |");
    t.diagnostic("|---|---|---|---|");
    for (const phase of [SCREENSHOT, CLICK]) {
      const names = [...new Set(steps.flatMap(u => [...u.calls.keys()]))].filter(u => u.startsWith(`${phase} `));
      const perStep = (name: string): number[] => steps.map(u => sum(u.calls.get(name)));
      const isBackend = (name: string): boolean => BACKEND_PARTS.includes(name.slice(phase.length + 1).split(".")[0] ?? "");
      for (const name of names.sort((a, b) => percentile(perStep(b), 0.5) - percentile(perStep(a), 0.5)))
        row(isBackend(name) ? name : `${phase}   ${name.slice(phase.length + 1)}`, perStep(name), percentile(steps.map(u => u.calls.get(name)?.length ?? 0), 0.5).toString());
      const totals = steps.map(u => u.totals.get(phase) ?? 0);
      const outside = steps.map((u, i) => (totals[i] ?? 0) - names.filter(isBackend).reduce((total, name) => total + sum(u.calls.get(name)), 0));
      row(phase === SCREENSHOT ? `${phase} masking, scaling, encoding and the tool's own work` : `${phase} the tool's own work`, outside);
      row(`${phase} total`, totals);
    }
    row("glide", steps.map(u => GLIDE_CALLS.reduce((total, name) => total + sum(u.calls.get(`${CLICK} ${name}`)), 0)));
    row("step total", steps.map(u => (u.totals.get(SCREENSHOT) ?? 0) + (u.totals.get(CLICK) ?? 0)));
    t.diagnostic(`image: median ${percentile(steps.map(u => u.bytes), 0.5)} bytes, p95 ${percentile(steps.map(u => u.bytes), 0.95)} bytes, ${steps[0]?.width ?? 0} by ${steps[0]?.height ?? 0} pixels`);
  }

  before(async () => {
    for (const start of PLATFORM.appStarts)
      apps.push(start());
    let windows: readonly StackedWindow[] = [];
    for (const deadline = Date.now() + 2 * TIMEOUT_MS; !apps.every(t => windows.some(u => t.isOf(u))) && Date.now() < deadline; await delay(200))
      windows = (await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS))).windows;
    assert.deepEqual(apps.filter(t => !windows.some(u => t.isOf(u))).map(t => `${t.appId}, process ${t.processId}, running ${t.isRunning()}`), [], `These apps show no window among the apps listed, ${[...new Set(windows.map(t => t.app?.id))].join(", ")}.`);
    window = await PLATFORM.openWindowAsync();
  });

  after(async () => {
    const ended = await Promise.allSettled([(async () => await window?.closeAsync(TIMEOUT_MS))(), ...apps.map(async t => await t.endAsync())]);
    await backend.closeAsync?.();
    await starter.endAsync();
    assert.deepEqual(ended.flatMap(t => (t.status === "rejected" ? [String(t.reason)] : [])), []);
  });

  it(`measures ${STEPS} steps, each a screenshot and a click, over the test window and ordinary apps`, async t => {
    const front = await frontAsync();
    const listed = (await backend.windows.listStackAsync(AbortSignal.timeout(TIMEOUT_MS))).windows;
    const display = (await backend.displays.listDisplaysAsync(AbortSignal.timeout(TIMEOUT_MS))).find(u => u.isPrimary);
    assert.ok(display !== undefined, "No primary display is listed.");

    const center = new RecordingPermissionCenter();
    const answerer = center.appAnswerer;
    const part = new RuntimePart(() => ({ apps: clock.timed("apps", backend.apps), border: clock.timed("border", backend.border), displays: clock.timed("displays", backend.displays), windows: clock.timed("windows", backend.windows), capture: clock.timed("capture", backend.capture), controls: clock.timed("controls", backend.controls), input: clock.timed("input", backend.input), physicalInput: clock.timed("physicalInput", backend.physicalInput) }));
    const context = new RuntimePartContextDouble(clock.timed("permissions", center), starter);
    await part.activateAsync(context);
    const answering = new AbortController();
    const ended = new Promise<null>(resolve => answering.signal.addEventListener("abort", () => resolve(null), { once: true }));
    const answered = (async () => {
      for (let pending = await Promise.race([answerer.nextAsync(), ended]); pending !== null; pending = await Promise.race([answerer.nextAsync(), ended]))
        answerer.answer(pending.id, pending.request.action === "computer-use.controlScreen" ? PermissionOption.AllowOnce : PermissionOption.AllowAlways);
    })();
    const session = context.tools.openSessionAs("session-1", "conversation-1");
    const callAsync = async (name: string, input: JsonObject): Promise<ToolResult> => {
      const outcome = await session.callAsync(name, input, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (outcome.isFailure)
        throw new ToolFailureException(outcome);

      return outcome;
    };
    try {
      await callAsync("computer_request_apps", { apps: [front.app.id, ...apps.map(u => listed.find(w => u.isOf(w))?.app?.id ?? u.appId)], reason: SUMMARY });

      const steps: IStepTimes[] = [];
      let marker: { readonly x: number; readonly y: number } | null = null;
      for (let step = 0; step < WARM_UP_STEPS + STEPS; step++) {
        clock.begin(SCREENSHOT);
        const shotStart = performance.now();
        const shot = await callAsync("computer_screenshot", {});
        const shotMs = performance.now() - shotStart;
        const [content] = shot.content;
        assert.ok(content?.kind === ToolContentKind.Image, `The screenshot answered ${shot.content.map(u => u.kind).join(", ")}.`);
        const png = Buffer.from(content.value, "base64");
        const image = PngImage.read(png);
        marker ??= findMarker(image);
        const k = image.width / display.width;
        const isBlank = step % 2 === 1;
        const at = isBlank ? { x: Math.round(marker.x + PLATFORM.blankOffset.x * k), y: Math.round(marker.y + PLATFORM.blankOffset.y * k) } : marker;

        clock.begin("");
        const { frame } = await frontAsync();
        const x: number = display.x + at.x / k;
        const y: number = display.y + at.y / k;
        assert.ok(x >= frame.x + EDGE && x < frame.x + frame.width - EDGE && y >= frame.y + EDGE && y < frame.y + frame.height - EDGE, `The click's point ${x}, ${y} lies outside the test window's frame ${JSON.stringify(frame)}.`);

        clock.begin(CLICK);
        const clickStart = performance.now();
        const click = await callAsync("computer_click", { x: at.x, y: at.y, summary: SUMMARY });
        const clickMs = performance.now() - clickStart;
        clock.begin("");
        assert.deepEqual(click.structured, { clicked: 1 });
        if (!isBlank || PLATFORM.reportsEveryClick)
          await window?.takeLineAsync("click ", TIMEOUT_MS);

        const calls = clock.take();
        if (step >= WARM_UP_STEPS)
          steps.push({ totals: new Map([[SCREENSHOT, shotMs], [CLICK, clickMs]]), calls, bytes: png.byteLength, width: image.width, height: image.height });
      }

      report(t, steps);
    } finally {
      answering.abort();
      await answered;
      await part.deactivateAsync();
    }
  });
});
