/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { afterEach } from "node:test";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { AppIdentity, AppInfo, DesktopRect, RuntimePart, WindowInfo } from "@noldova/computer-use.runtime";
import { AppShortcut, KeyChord } from "@noldova/desktop.protocol";
import { PermissionOption, ToolCall, type ToolFailureCode, ToolFailureException, type ToolResult, type ToolSession } from "@noldova/desktop.runtime";

import { AppBackendDouble } from "../doubles/app-backend-double.fixture.ts";
import { CaptureBackendDouble } from "../doubles/capture-backend-double.fixture.ts";
import { ControlBackendDouble } from "../doubles/control-backend-double.fixture.ts";
import { DisplayBackendDouble } from "../doubles/display-backend-double.fixture.ts";
import { InputBackendDouble } from "../doubles/input-backend-double.fixture.ts";
import type { IPendingPermission } from "../doubles/interfaces/i-pending-permission.ts";
import type { IPermissionIntercept } from "../doubles/interfaces/i-permission-intercept.ts";
import { OperatingSystemBackendDouble } from "../doubles/operating-system-backend-double.fixture.ts";
import type { PermissionAnswererDouble } from "../doubles/permission-answerer-double.fixture.ts";
import { PhysicalInputMonitorDouble } from "../doubles/physical-input-monitor-double.fixture.ts";
import { RecordingModuleLog } from "../doubles/recording-module-log.fixture.ts";
import { RecordingPermissionCenter } from "../doubles/recording-permission-center.fixture.ts";
import type { RegistryToolsContext } from "../doubles/registry-tools-context.fixture.ts";
import { RuntimePartContextDouble } from "../doubles/runtime-part-context-double.fixture.ts";
import { WindowBackendDouble } from "../doubles/window-backend-double.fixture.ts";

export class RuntimeHarness {
  private static readonly STARTED: Set<RuntimeHarness> = new Set();
  private static readonly TEST_ENDED: string = "The test ended.";
  private readonly appShortcuts: readonly AppShortcut[] | null;
  private readonly kitAccentFile: string | undefined;
  private readonly sessions: Map<string, ToolSession> = new Map();
  public static readonly controlApp: string = "computer-use.controlApp";
  public static readonly controlScreen: string = "computer-use.controlScreen";
  public static readonly defaultExpiryMilliseconds: number = 60_000;
  public static readonly heartbeatIntervalMs: number = 600_000;
  public static readonly moduleId: string = "computer-use";
  public static readonly scope: string = "conversation-1";
  public static readonly sessionId: string = "session-1";
  public static readonly systemKeys: string = "computer-use.systemKeys";
  public static readonly notes: AppInfo = new AppInfo(new AppIdentity("C:\\Program Files\\Notes\\notes.exe"), "Notes", "Example Ltd", true, false);
  public static readonly terminal: AppInfo = new AppInfo(new AppIdentity("C:\\Windows\\System32\\cmd.exe"), "Command Prompt", "Microsoft Corporation", true, false);
  public static readonly files: AppInfo = new AppInfo(new AppIdentity("C:\\Windows\\explorer.exe"), "File Explorer", null, true, false);
  public static readonly prompt: AppInfo = new AppInfo(new AppIdentity("C:\\Windows\\System32\\consent.exe"), "Consent", "Microsoft Corporation", true, false);
  public static readonly host: AppInfo = new AppInfo(new AppIdentity("C:\\Program Files\\Host\\host.exe"), "Host", "Noldova", true, true);
  public readonly answerer: PermissionAnswererDouble;
  public readonly apps: AppBackendDouble;
  public readonly backend: OperatingSystemBackendDouble;
  public readonly center: RecordingPermissionCenter;
  public readonly input: InputBackendDouble;
  public readonly monitor: PhysicalInputMonitorDouble;
  public readonly windows: WindowBackendDouble;
  public context: RuntimePartContextDouble;
  public part: RuntimePart;

  private constructor(
    center: RecordingPermissionCenter,
    input: InputBackendDouble,
    windows: WindowBackendDouble,
    appShortcuts: readonly string[] | undefined,
    kitAccentFile: string | undefined,
    heartbeatIntervalMs: number
  ) {
    this.monitor = new PhysicalInputMonitorDouble(heartbeatIntervalMs, () => 0);
    this.apps = new AppBackendDouble([RuntimeHarness.notes, RuntimeHarness.terminal, RuntimeHarness.files, RuntimeHarness.prompt, RuntimeHarness.host]);
    this.backend = new OperatingSystemBackendDouble(
      this.apps,
      new DisplayBackendDouble([]),
      windows,
      new CaptureBackendDouble([]),
      new ControlBackendDouble(),
      input,
      this.monitor
    );
    this.center = center;
    this.answerer = center.appAnswerer;
    this.input = input;
    this.appShortcuts = appShortcuts === undefined ? null : RuntimeHarness.shortcutsOf(appShortcuts);
    this.kitAccentFile = kitAccentFile;
    this.part = new RuntimePart(() => this.backend, kitAccentFile);
    this.context = this.contextOf(null);
    this.windows = windows;
  }

  public get tools(): RegistryToolsContext {
    return this.context.tools;
  }

  public static async startAsync(
    expiryMilliseconds: number = RuntimeHarness.defaultExpiryMilliseconds,
    maxTextChunkLength: number = 100,
    intercept: IPermissionIntercept | null = null,
    appShortcuts?: readonly string[],
    kitAccentFile?: string,
    heartbeatIntervalMs: number = RuntimeHarness.heartbeatIntervalMs
  ): Promise<RuntimeHarness> {
    const windows = new WindowBackendDouble(RuntimeHarness.windowOf(RuntimeHarness.notes));
    const center = new RecordingPermissionCenter(expiryMilliseconds);
    center.intercept = intercept;
    const harness = new RuntimeHarness(center, new InputBackendDouble(windows, maxTextChunkLength), windows, appShortcuts, kitAccentFile, heartbeatIntervalMs);
    RuntimeHarness.STARTED.add(harness);
    await harness.part.activateAsync(harness.context);

    return harness;
  }

  public static endWatches(): void {
    for (const harness of RuntimeHarness.STARTED)
      if (harness.monitor.isRunning)
        harness.tools.stopAll(RuntimeHarness.TEST_ENDED);
    RuntimeHarness.STARTED.clear();
  }

  public static windowOf(app: AppInfo, isElevated: boolean = false): WindowInfo {
    return new WindowInfo(app.identity, app.name, "100", 42, new DesktopRect(0, 0, 800, 600), isElevated);
  }

  public static listingOf(granted: readonly AppInfo[]): JsonObject {
    const tiers: readonly [AppInfo, string | null][] = [
      [RuntimeHarness.notes, "Full"],
      [RuntimeHarness.terminal, "ClickOnly"],
      [RuntimeHarness.files, "Full"],
      [RuntimeHarness.prompt, null],
      [RuntimeHarness.host, null]
    ];

    return {
      apps: tiers.map(t => ({
        identity: t[0].identity.id,
        name: t[0].name,
        publisher: t[0].publisher,
        isRunning: t[0].isRunning,
        tier: t[1],
        isGranted: granted.includes(t[0])
      }))
    };
  }

  public static async assertFailsAsync(call: Promise<unknown>, code: ToolFailureCode, message?: RegExp): Promise<void> {
    await assert.rejects(call, t => t instanceof ToolFailureException && t.failure.code === code && (message === undefined || message.test(t.failure.message)));
  }

  public async callAsync(name: string, input: JsonObject, signal?: AbortSignal, scope: string = RuntimeHarness.scope, sessionId: string = RuntimeHarness.sessionId): Promise<ToolResult> {
    const outcome = await this.sessionOf(sessionId, scope).callAsync(name, input, signal === undefined ? {} : { signal });
    if (outcome.isFailure)
      throw new ToolFailureException(outcome);

    return outcome;
  }

  public async callDirectlyAsync(
    name: string,
    input: JsonObject,
    signal: AbortSignal = new AbortController().signal,
    scope: string = RuntimeHarness.scope,
    sessionId: string = RuntimeHarness.sessionId
  ): Promise<ToolResult> {
    const session = this.sessionOf(sessionId, scope);
    const handler = this.tools.handlers.get(name);
    const descriptor = this.tools.registry.listTools().find(t => t.name === name);
    assert.ok(handler !== undefined && descriptor !== undefined);
    const log = new RecordingModuleLog();
    const call = new ToolCall(session.id, session.scope, session.bindings, input, Date.now() + descriptor.deadline.default, signal, {
      requestAsync: async (request, requestSignal) => await this.center.requestAsync(RuntimeHarness.moduleId, descriptor, log, session, request, requestSignal)
    });

    return await handler.handleAsync(call);
  }

  public endSession(sessionId: string = RuntimeHarness.sessionId): void {
    this.sessions.get(sessionId)?.end();
    this.sessions.delete(sessionId);
  }

  public async answerAsync(action: string, option: PermissionOption): Promise<IPendingPermission> {
    const pending = await this.answerer.nextAsync();
    assert.equal(pending.request.action, action);
    this.answerer.answer(pending.id, option);

    return pending;
  }

  public async grantAppAsync(app: AppInfo, scope: string = RuntimeHarness.scope, sessionId: string = RuntimeHarness.sessionId): Promise<void> {
    const call = this.callAsync("computer_request_apps", { apps: [app.identity.id], reason: "To write the note." }, undefined, scope, sessionId);
    let pending = await this.answerer.nextAsync();
    if (pending.request.action === RuntimeHarness.controlScreen) {
      this.answerer.answer(pending.id, PermissionOption.AllowOnce);
      pending = await this.answerer.nextAsync();
    }
    assert.equal(pending.request.action, RuntimeHarness.controlApp);
    this.answerer.answer(pending.id, PermissionOption.AllowAlways);
    await call;
  }

  public async switchAsync(isOn: boolean): Promise<void> {
    if (!isOn) {
      await this.part.deactivateAsync();
      this.context.deactivate();
      return;
    }

    this.sessions.clear();
    this.part = new RuntimePart(() => this.backend, this.kitAccentFile);
    this.context = this.contextOf(this.context);
    await this.part.activateAsync(this.context);
  }

  public async reactivateAsync(): Promise<void> {
    this.sessions.clear();
    this.context = this.contextOf(null);
    await this.part.activateAsync(this.context);
  }

  private contextOf(earlier: RuntimePartContextDouble | null): RuntimePartContextDouble {
    const context = new RuntimePartContextDouble(this.center, undefined, undefined, earlier);
    if (this.appShortcuts !== null)
      context.listedShortcuts = this.appShortcuts;

    return context;
  }

  private static shortcutsOf(texts: readonly string[]): readonly AppShortcut[] {
    return texts.map(t => KeyChord.find(t)).filter(t => t !== null).map(t => new AppShortcut(t, null, true));
  }

  private sessionOf(id: string, scope: string): ToolSession {
    let session = this.sessions.get(id);
    if (session === undefined) {
      session = this.tools.openSessionAs(id, scope);
      this.sessions.set(id, session);
    }

    return session;
  }
}

afterEach(() => RuntimeHarness.endWatches());
