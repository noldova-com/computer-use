/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { tmpdir } from "node:os";
import { finished } from "node:stream/promises";

import { type OwnedProcess, ProcessRequest } from "@noldova/desktop.runtime";

import { MacScriptClosedException } from "../exceptions/mac-script-closed.exception.ts";
import type { MacScriptEndedException } from "../exceptions/mac-script-ended.exception.ts";
import { MacScriptExitedException } from "../exceptions/mac-script-exited.exception.ts";
import { MacScriptFailedException } from "../exceptions/mac-script-failed.exception.ts";
import { MacScriptInputFailedException } from "../exceptions/mac-script-input-failed.exception.ts";
import { MacScriptLineUnreadableException } from "../exceptions/mac-script-line-unreadable.exception.ts";
import { MacScriptOutputFailedException } from "../exceptions/mac-script-output-failed.exception.ts";
import { MacScriptStartFailedException } from "../exceptions/mac-script-start-failed.exception.ts";
import { MacScriptTimedOutException } from "../exceptions/mac-script-timed-out.exception.ts";
import type { IMacScriptChannel } from "../interfaces/i-mac-script-channel.ts";
import type { IProgramStarter } from "../interfaces/i-program-starter.ts";
import { Resources } from "../resources.ts";

interface IPendingCall {
  readonly id: number;
  readonly method: string;
  readonly reject: (error: Error) => void;
  readonly resolve: (value: unknown) => void;
  readonly timer: NodeJS.Timeout;
}

export class MacScriptProcess implements IMacScriptChannel {
  private readonly parameters: readonly string[];
  private readonly pending: Map<number, IPendingCall> = new Map();
  private readonly program: string;
  private readonly starter: IProgramStarter;
  private readonly timeoutMs: number;
  private child: Promise<OwnedProcess> | null = null;
  private nextId: number = 1;

  public constructor(starter: IProgramStarter, program: string, parameters: readonly string[], timeoutMs: number) {
    this.parameters = parameters;
    this.program = program;
    this.starter = starter;
    this.timeoutMs = timeoutMs;
  }

  public async callAsync(method: string, parameters: object): Promise<unknown> {
    const starting = this.child ?? this.startAsync();
    const id = this.nextId++;
    const line = JSON.stringify({ id, method, parameters }).replace(Resources.nonAsciiPattern, MacScriptProcess.escape) + Resources.lineBreak;

    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.end(starting, () => new MacScriptTimedOutException(method, this.timeoutMs)), this.timeoutMs);
      this.pending.set(id, { id, method, reject, resolve, timer });
      starting.then(t => void (this.pending.has(id) && t.input.write(line)), () => undefined);
    });
  }

  public async closeAsync(): Promise<void> {
    const starting = this.child;
    if (starting === null)
      return;

    this.end(starting, () => new MacScriptClosedException());
    await starting.then(async t => await t.exited, () => undefined);
  }

  private startAsync(): Promise<OwnedProcess> {
    const starting = this.starter.startProcessAsync(new ProcessRequest(this.program, this.parameters, tmpdir()));
    this.child = starting;
    starting.then(t => this.watch(starting, t), (error: unknown) => this.end(starting, () => new MacScriptStartFailedException(error)));

    return starting;
  }

  private watch(starting: Promise<OwnedProcess>, child: OwnedProcess): void {
    child.input.on("error", (error: unknown) => this.end(starting, () => new MacScriptInputFailedException(error)));
    let lastError = "";
    let partialError = "";
    child.errors.setEncoding(Resources.textEncoding);
    child.errors.on("data", (chunk: string) => {
      const lines = `${partialError}${chunk}`.split(Resources.lineBreak);
      partialError = lines.splice(-1).join("").slice(0, Resources.macScriptMaxErrorLength);
      for (const line of lines.slice(-1))
        lastError = line.slice(0, Resources.macScriptMaxErrorLength);
    });
    let partial = "";
    void Promise.all([child.exited, finished(child.errors), finished(child.output)]).then(([exit]) => {
      if (this.child === starting && partial !== "")
        this.answer(starting, partial);
      this.end(starting, () => new MacScriptExitedException(exit, partialError === "" ? lastError : partialError));
    }, (error: unknown) => this.end(starting, () => new MacScriptOutputFailedException(error)));
    child.output.setEncoding(Resources.textEncoding);
    child.output.on("data", (chunk: string) => {
      const lines = `${partial}${chunk}`.split(Resources.lineBreak);
      partial = lines.splice(-1).join("");
      for (const line of lines)
        if (this.child === starting)
          this.answer(starting, line);
      if (this.child === starting && partial.length > Resources.macScriptMaxLineLength) {
        const length = partial.length;
        partial = "";
        this.end(starting, () => new MacScriptLineUnreadableException(length));
      }
    });
  }

  private answer(child: Promise<OwnedProcess>, line: string): void {
    if (line.length > Resources.macScriptMaxLineLength) {
      this.end(child, () => new MacScriptLineUnreadableException(line.length));
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      this.end(child, () => new MacScriptLineUnreadableException(line.length));
      return;
    }
    const answer = typeof value === "object" ? value : null;
    const call = answer !== null && "id" in answer && typeof answer.id === "number" ? this.pending.get(answer.id) : undefined;
    const error = answer !== null && "error" in answer ? answer.error : undefined;
    if (answer === null || call === undefined || (error !== undefined && typeof error !== "string")) {
      this.end(child, () => new MacScriptLineUnreadableException(line.length));
      return;
    }

    this.pending.delete(call.id);
    clearTimeout(call.timer);
    if (typeof error === "string")
      call.reject(new MacScriptFailedException(call.method, error));
    else
      call.resolve("result" in answer ? answer.result : undefined);
  }

  private static escape(character: string): string {
    return Array.from({ length: character.length }, (_, i) => Resources.formatUnicodeEscape(character.charCodeAt(i))).join("");
  }

  private end(child: Promise<OwnedProcess>, ended: () => MacScriptEndedException): void {
    if (this.child !== child)
      return;

    this.child = null;
    child.then(async t => await t.stopAsync().catch((error: unknown) => this.starter.log.write(Resources.formatMacScriptStopFailed(String(error)))), () => undefined);
    const calls = [...this.pending.values()];
    this.pending.clear();
    for (const call of calls) {
      clearTimeout(call.timer);
      call.reject(ended());
    }
  }
}
