/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IToolHandler, ToolDescriptor, type ToolRegistry, type ToolSession } from "@noldova/desktop.runtime";
import { FakeToolsContext } from "@noldova/desktop.runtime/testing";

import type { SharedToolRegistry } from "./shared-tool-registry.fixture.ts";

export class RegistryToolsContext extends FakeToolsContext {
  private readonly shared: SharedToolRegistry;

  public constructor(shared: SharedToolRegistry) {
    super(shared.log);
    this.shared = shared;
    const registry = shared.registry;
    const module = shared.moduleId;
    this.answer("register", (descriptor, handler) =>
      registry.register(module, new ToolDescriptor(descriptor, shared.tools), shared.track(descriptor.name, handler), shared.tools, shared.log));
    this.answer("openSession", (scope, bindings) => registry.openSession(scope, bindings));
    this.answer("onSessionEnded", listener => registry.onSessionEnded(listener, shared.log));
    this.answer("stopSession", (session, reason) => registry.stopSession(module, session, reason));
    this.answer("onSessionStopped", listener => registry.onSessionStopped(listener, shared.log));
    this.answer("stopAll", reason => registry.stopAll(reason));
    this.answer("resumeAll", () => registry.resumeAll(module));
    this.answer("onStopped", listener => registry.onStopped(listener, shared.log));
    this.answer("onResumed", listener => registry.onResumed(listener, shared.log));
  }

  public override get isStopped(): boolean {
    return this.shared.registry.isStopped;
  }

  public get handlers(): ReadonlyMap<string, IToolHandler> {
    return this.shared.handlers;
  }

  public get messages(): readonly string[] {
    return this.shared.messages;
  }

  public get registry(): ToolRegistry {
    return this.shared.registry;
  }

  public async idleAsync(): Promise<void> {
    await this.shared.idleAsync();
  }

  public openSessionAs(id: string, scope: string): ToolSession {
    return this.shared.openSessionAs(id, scope);
  }
}
