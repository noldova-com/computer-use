/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type IToolHandler, type PermissionCenter, ToolRegistry, type ToolSession } from "@noldova/desktop.runtime";

import { RecordingModuleLog } from "./recording-module-log.fixture.ts";

export class SharedToolRegistry {
  private nextSessionId: string = "";
  private readonly running: Set<Promise<unknown>> = new Set();
  public readonly handlers: Map<string, IToolHandler> = new Map();
  public readonly log: RecordingModuleLog = new RecordingModuleLog();
  public readonly moduleId: string;
  public readonly registry: ToolRegistry;
  public readonly tools: readonly string[];

  public constructor(moduleId: string, tools: readonly string[], permissions: PermissionCenter) {
    this.moduleId = moduleId;
    this.tools = tools;
    this.registry = new ToolRegistry(() => this.nextSessionId, undefined, permissions);
  }

  public get messages(): readonly string[] {
    return this.log.messages;
  }

  public track(name: string, handler: IToolHandler): IToolHandler {
    this.handlers.set(name, handler);

    return {
      handleAsync: async call => {
        const run = handler.handleAsync(call);
        this.running.add(run);
        try {
          return await run;
        } finally {
          this.running.delete(run);
        }
      }
    };
  }

  public async idleAsync(): Promise<void> {
    await Promise.allSettled([...this.running]);
  }

  public openSessionAs(id: string, scope: string): ToolSession {
    this.nextSessionId = id;

    return this.registry.openSession(scope, {});
  }
}
