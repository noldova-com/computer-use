/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { tmpdir } from "node:os";
import path from "node:path";

import { ProcessRequest } from "@noldova/desktop.runtime";

import type { IMacSignatureReader } from "../interfaces/i-mac-signature-reader.ts";
import type { IProgramStarter } from "../interfaces/i-program-starter.ts";
import { Resources } from "../resources.ts";
import { BoundedText } from "./bounded-text.ts";
import { ProgramDeadline } from "./program-deadline.ts";

export class MacCodeSignProgram implements IMacSignatureReader {
  private readonly parameters: readonly string[];
  private readonly program: string;
  private readonly starter: IProgramStarter;
  private readonly timeoutMs: number;

  public constructor(starter: IProgramStarter, program: string, parameters: readonly string[], timeoutMs: number) {
    this.parameters = parameters;
    this.program = program;
    this.starter = starter;
    this.timeoutMs = timeoutMs;
  }

  public async readSignerAsync(bundlePath: string, signal: AbortSignal): Promise<string | null> {
    const deadline = new ProgramDeadline(signal, this.timeoutMs);
    try {
      const program = await this.starter.startProcessAsync(new ProcessRequest(this.program, [...this.parameters, ...Resources.macCodeSignParameters, bundlePath],
        tmpdir(), {}, [], deadline.signal));
      program.output.resume();
      const [details, exit] = await Promise.all([BoundedText.readAsync(program.errors, Resources.maxCodeSignDetailsLength), program.exited]);
      signal.throwIfAborted();
      if (deadline.hasExpired)
        this.starter.log.write(Resources.formatMacCodeSignTimedOut(path.basename(bundlePath)));
      const authority = exit.isClean ? (Resources.macAuthorityPattern.exec(details)?.[1] ?? "").trim() : "";

      return authority === Resources.macAppleAuthority ? Resources.macApplePublisher : Resources.macDeveloperIdPattern.exec(authority)?.[1] ?? null;
    } finally {
      deadline.end();
    }
  }
}
