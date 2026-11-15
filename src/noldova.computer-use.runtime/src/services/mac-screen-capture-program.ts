/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { ProcessRequest, ProcessStartException } from "@noldova/desktop.runtime";

import { MacCaptureEndedException } from "../exceptions/mac-capture-ended.exception.ts";
import { MacCaptureFailedException } from "../exceptions/mac-capture-failed.exception.ts";
import { MacCaptureFileLeftException } from "../exceptions/mac-capture-file-left.exception.ts";
import { MacCaptureFileTooLargeException } from "../exceptions/mac-capture-file-too-large.exception.ts";
import type { IMacScreenCapturer } from "../interfaces/i-mac-screen-capturer.ts";
import type { IProgramStarter } from "../interfaces/i-program-starter.ts";
import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";
import { ProgramDeadline } from "./program-deadline.ts";

export class MacScreenCaptureProgram implements IMacScreenCapturer {
  private readonly folder: string;
  private readonly parameters: readonly string[];
  private readonly program: string;
  private readonly starter: IProgramStarter;
  private readonly timeoutMs: number;

  public constructor(starter: IProgramStarter, program: string, parameters: readonly string[], timeoutMs: number, folder: string) {
    this.folder = folder;
    this.parameters = parameters;
    this.program = program;
    this.starter = starter;
    this.timeoutMs = timeoutMs;
  }

  public async captureWindowAsync(windowId: string, signal: AbortSignal): Promise<Uint8Array> {
    const file = path.join(this.folder, Resources.formatMacCaptureFile(process.pid, randomUUID()));
    const deadline = new ProgramDeadline(signal, this.timeoutMs);
    let png: Uint8Array;
    try {
      await this.prepareFolderAsync();
      await this.runAsync([...this.parameters, Resources.formatMacCaptureWindowArgument(windowId), ...Resources.macCaptureOptions, file], deadline.signal);
      png = await MacScreenCaptureProgram.readCaptureAsync(file);
    } catch (error) {
      await this.removeAfterFailureAsync(file);
      signal.throwIfAborted();
      if (MacScreenCaptureProgram.isCaptureFailure(error) || (deadline.hasExpired && error === deadline.signal.reason))
        throw new MacCaptureFailedException(error);

      throw error;
    } finally {
      deadline.end();
    }
    await MacScreenCaptureProgram.removeAsync(file);
    signal.throwIfAborted();

    return png;
  }

  private async runAsync(parameters: readonly string[], signal: AbortSignal): Promise<void> {
    const program = await this.starter.startProcessAsync(new ProcessRequest(this.program, parameters, this.folder, {}, [], signal));
    program.output.resume();
    program.errors.resume();
    const exit = await program.exited;
    if (!exit.isClean)
      throw new MacCaptureEndedException(exit);
  }

  private async prepareFolderAsync(): Promise<void> {
    await mkdir(this.folder, { recursive: true, mode: Resources.privateFolderMode });
    await chmod(this.folder, Resources.privateFolderMode);
    for (const name of await readdir(this.folder))
      if (!MacScreenCaptureProgram.isRunning(Number.parseInt(name, Resources.decimalRadix)))
        await rm(path.join(this.folder, name), { force: true, recursive: true });
  }

  private async removeAfterFailureAsync(file: string): Promise<void> {
    await MacScreenCaptureProgram.removeAsync(file).catch((error: unknown) => {
      if (!(error instanceof MacCaptureFileLeftException))
        throw error;

      this.starter.log.write(error.message);
    });
  }

  private static async readCaptureAsync(file: string): Promise<Uint8Array> {
    const handle = await open(file);
    try {
      const size = (await handle.stat()).size;
      if (size > Resources.maxCaptureFileBytes)
        throw new MacCaptureFileTooLargeException(size);

      const png = new Uint8Array(size);
      const { bytesRead } = await handle.read(png, 0, size, 0);

      return png.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  private static async removeAsync(file: string): Promise<void> {
    await rm(file, { force: true }).catch((error: unknown) => {
      if (!BackendFailures.isSystemError(error))
        throw error;

      throw new MacCaptureFileLeftException(file, error);
    });
  }

  private static isCaptureFailure(error: unknown): boolean {
    return error instanceof MacCaptureEndedException || error instanceof ProcessStartException || BackendFailures.isSystemError(error);
  }

  private static isRunning(processId: number): boolean {
    if (!(processId > 0 && processId <= Resources.maxProcessId))
      return false;
    try {
      process.kill(processId, Resources.probeSignal);

      return true;
    } catch (error) {
      if (!BackendFailures.isSystemError(error))
        throw error;

      return BackendFailures.hasCode(error, Resources.processDeniedCode);
    }
  }
}
