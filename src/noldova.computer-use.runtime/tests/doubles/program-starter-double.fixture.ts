/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { spawn } from "node:child_process";
import { addAbortListener } from "node:events";

import type { IProgramStarter } from "@noldova/computer-use.runtime";
import { OwnedProcess, ProcessExit, type ProcessRequest } from "@noldova/desktop.runtime";

import { RecordingModuleLog } from "./recording-module-log.fixture.ts";

export class ProgramStarterDouble implements IProgramStarter {
  private static readonly SHARED_NAMES: readonly string[] = ["PATH", "TEMP", "TMP", "TMPDIR"];
  private static readonly POSIX_NAMES: readonly string[] = ["HOME", "LANG", "LC_ALL"];
  private static readonly WINDOWS_NAMES: readonly string[] = ["SystemRoot", "windir", "PATHEXT", "ComSpec", "USERPROFILE", "SystemDrive", "LOCALAPPDATA", "APPDATA", "ProgramData", "ProgramFiles"];

  public failure: Error | null = null;
  public readonly log: RecordingModuleLog = new RecordingModuleLog();
  public readonly programs: OwnedProcess[] = [];
  public readonly requests: ProcessRequest[] = [];
  public stopFailure: Error | null = null;

  public get written(): readonly string[] {
    return this.log.messages;
  }

  public startProcessAsync(request: ProcessRequest): Promise<OwnedProcess> {
    this.requests.push(request);
    if (request.signal?.aborted === true)
      return Promise.reject(request.signal.reason);
    if (this.failure !== null) {
      const failure = this.failure;
      this.failure = null;

      return Promise.reject(failure);
    }

    const child = spawn(request.program, [...request.arguments],
      { cwd: request.workingFolder, env: ProgramStarterDouble.environmentOf(request), stdio: "pipe", windowsHide: true });

    return new Promise<OwnedProcess>((resolve, reject) => {
      child.once("error", reject);
      child.once("spawn", () => {
        const exited = new Promise<ProcessExit>(t => child.once("exit", (code, signal) => t(new ProcessExit(code, signal))));
        const owned = new OwnedProcess(child, request.program, new Date(), exited, async () => {
          if (process.platform === "win32" && !child.stdin.writableEnded)
            child.stdin.end();
          child.kill();
          await exited;
          if (this.stopFailure !== null)
            throw this.stopFailure;
        });
        if (request.signal !== undefined)
          addAbortListener(request.signal, () => void owned.stopAsync().catch((error: unknown) => this.log.write(`The program's stop failed: ${String(error)}`)));
        this.programs.push(owned);
        resolve(owned);
      });
    });
  }

  public nextWriteAsync(): Promise<string> {
    return this.log.nextWriteAsync();
  }

  public async endAsync(): Promise<void> {
    await Promise.all(this.programs.splice(0).filter(t => !t.hasExited).map(async t => await t.stopAsync()));
  }

  private static environmentOf(request: ProcessRequest): NodeJS.ProcessEnv {
    const isWindows = process.platform === "win32";
    const keyOf = (name: string): string => isWindows ? name.toUpperCase() : name;
    const names = [...ProgramStarterDouble.SHARED_NAMES, ...isWindows ? ProgramStarterDouble.WINDOWS_NAMES : ProgramStarterDouble.POSIX_NAMES, ...request.inherit];
    const wanted: ReadonlySet<string> = new Set(names.map(keyOf));
    const replaced: ReadonlySet<string> = new Set(Object.keys(request.environment).map(keyOf));

    return { ...Object.fromEntries(Object.entries(process.env).filter(([t]) => wanted.has(keyOf(t)) && !replaced.has(keyOf(t)))), ...request.environment };
  }
}
