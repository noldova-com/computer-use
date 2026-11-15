/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from "node:fs";

import type { JsonValue } from "@noldova/computer-use.protocol";
import { AppShortcut, AppWindow, KeyChord } from "@noldova/desktop.protocol";
import { EventChannel, type IMethodHandler, type PermissionCenter, RequestContext, WorkItem } from "@noldova/desktop.runtime";
import { FakeRuntimePartContext } from "@noldova/desktop.runtime/testing";

import type { IModuleContributions } from "./interfaces/i-module-contributions.ts";
import type { IPublishedEvent } from "./interfaces/i-published-event.ts";
import { ModuleSettingsDouble } from "./module-settings-double.fixture.ts";
import { ProgramStarterDouble } from "./program-starter-double.fixture.ts";
import { RecordingModuleLog } from "./recording-module-log.fixture.ts";
import { RegistryToolsContext } from "./registry-tools-context.fixture.ts";
import { SharedToolRegistry } from "./shared-tool-registry.fixture.ts";

export class RuntimePartContextDouble extends FakeRuntimePartContext {
  private static readonly MODULE_FILE: URL = new URL("../../../noldova.computer-use/module.json", import.meta.url);
  private readonly contributions: IModuleContributions;
  private readonly declared: Set<string> = new Set();
  private readonly handlers: Map<string, IMethodHandler> = new Map();
  private readonly shared: SharedToolRegistry;
  private readonly work: Set<WorkItem> = new Set();
  public static readonly mainWindow: AppWindow = new AppWindow(4210, 4210);
  public static readonly moduleId: string = "computer-use";
  public static readonly stopKey: AppShortcut = new AppShortcut(KeyChord.parse("Mod+Shift+Period"), "desktop.stopAgentControl", true);
  public readonly events: IPublishedEvent[] = [];
  public listedShortcuts: readonly AppShortcut[] = [RuntimePartContextDouble.stopKey];
  public listedWindows: readonly AppWindow[] = [RuntimePartContextDouble.mainWindow];
  public override readonly log: RecordingModuleLog = new RecordingModuleLog();
  public readonly services: Map<string, object> = new Map();
  public override readonly settings: ModuleSettingsDouble;
  public readonly starter: ProgramStarterDouble;
  public override readonly tools: RegistryToolsContext;

  public constructor(
    permissions: PermissionCenter,
    starter: ProgramStarterDouble = new ProgramStarterDouble(),
    contributions: IModuleContributions = RuntimePartContextDouble.readContributions(),
    earlier: RuntimePartContextDouble | null = null
  ) {
    super();
    this.contributions = contributions;
    this.starter = starter;
    this.settings = new ModuleSettingsDouble(earlier?.settings.sharedValues);
    this.shared = earlier?.shared ?? new SharedToolRegistry(RuntimePartContextDouble.moduleId, contributions.tools ?? [], permissions);
    this.tools = new RegistryToolsContext(this.shared);
    this.answer("beginWork", description => this.beginWorkItem(description));
    this.answer("startProcessAsync", async request => await this.starter.startProcessAsync(request));
    this.answer("registerMethod", (name, handler) => this.registerHandler(name, handler));
    this.answer("publishService", (name, service) => this.publish(name, service));
    this.answer("declareEvent", name => this.openEvent(name));
    this.appWindows.answer("list", () => this.listedWindows);
    this.shortcuts.answer("list", () => this.listedShortcuts);
  }

  public get written(): readonly string[] {
    return this.log.messages;
  }

  public deactivate(): void {
    this.settings.deactivate();
  }

  public listedWork(): readonly string[] {
    return [...this.work].map(t => t.description);
  }

  public stopWork(): void {
    for (const item of [...this.work])
      item.cancel();
  }

  public async callMethodAsync(name: string, payload: JsonValue): Promise<JsonValue> {
    const handler = this.handlers.get(name);
    if (handler === undefined)
      throw new RangeError(`The method ${name} isn't registered.`);

    return await handler.handleAsync(new RequestContext("client-1", payload, new AbortController().signal, 1));
  }

  public published(name: string): readonly JsonValue[] {
    return this.events.filter(t => t.name === name).map(t => t.payload);
  }

  private beginWorkItem(description: string): WorkItem {
    const item = new WorkItem(description, t => void this.work.delete(t));
    this.work.add(item);

    return item;
  }

  private registerHandler(name: string, handler: IMethodHandler): void {
    if (!(this.contributions.methods ?? []).includes(name))
      throw new RangeError(`The module doesn't contribute the method ${name}.`);
    if (this.handlers.has(name))
      throw new RangeError(`The method ${name} is already registered.`);

    this.handlers.set(name, handler);
  }

  private publish(name: string, service: object): void {
    if (!name.startsWith(`${RuntimePartContextDouble.moduleId}.`))
      throw new RangeError(`The service ${name} isn't the module's own.`);
    if (this.services.has(name))
      throw new RangeError(`The service ${name} is already published.`);

    this.services.set(name, service);
  }

  private openEvent(name: string): EventChannel {
    if (!(this.contributions.events ?? []).includes(name))
      throw new RangeError(`The module doesn't contribute the event ${name}.`);
    if (this.declared.has(name))
      throw new RangeError(`The event ${name} is already declared.`);

    this.declared.add(name);

    return new EventChannel(payload => {
      if (this.declared.has(name))
        this.events.push({ name, payload });
    }, () => void this.declared.delete(name));
  }

  private static readContributions(): IModuleContributions {
    const declaration: unknown = JSON.parse(fs.readFileSync(RuntimePartContextDouble.MODULE_FILE, "utf8"));
    const contributes = typeof declaration === "object" && declaration !== null && "contributes" in declaration ? declaration.contributes : null;
    if (typeof contributes !== "object" || contributes === null)
      throw new RangeError(`${RuntimePartContextDouble.MODULE_FILE.pathname} contributes nothing.`);

    return {
      methods: RuntimePartContextDouble.namesOf(contributes, "methods"),
      events: RuntimePartContextDouble.namesOf(contributes, "events"),
      tools: RuntimePartContextDouble.namesOf(contributes, "tools")
    };
  }

  private static namesOf(contributes: object, kind: string): readonly string[] {
    const names: unknown = Object.entries(contributes).find(t => t[0] === kind)?.[1];

    return Array.isArray(names) ? names.filter((t: unknown) => typeof t === "string") : [];
  }
}
