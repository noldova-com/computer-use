/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { TestAppLayout } from "./fixtures/test-app-layout.ts";

const run = promisify(execFile);

class HostedMacGrants {
  private static readonly DATABASE: string = "/Library/Application Support/com.apple.TCC/TCC.db";
  private static readonly SERVICES: readonly string[] = ["kTCCServiceAccessibility", "kTCCServiceScreenCapture"];
  private static readonly SUDO: string = "/usr/bin/sudo";
  private static readonly SQLITE: string = "/usr/bin/sqlite3";
  private static readonly CODESIGN: string = "/usr/bin/codesign";
  private static readonly CSREQ: string = "/usr/bin/csreq";
  private static readonly PLUTIL: string = "/usr/bin/plutil";
  private static readonly EXECUTABLES: string = `${path.sep}Contents${path.sep}MacOS${path.sep}`;
  private static readonly REQUIREMENT_PREFIX: string = "designated => ";
  private static readonly IDENTIFIER: RegExp = /^[A-Za-z0-9.-]+$/;
  private static readonly NOT_HOSTED: string = "Only a GitHub-hosted macOS runner grants the test app here; on any other Mac a person gives the grants.";

  public static async runAsync(): Promise<void> {
    if (process.platform !== "darwin" || process.env["GITHUB_ACTIONS"] !== "true" || process.env["RUNNER_ENVIRONMENT"] !== "github-hosted")
      throw new Error(HostedMacGrants.NOT_HOSTED);
    const executable = (await readFile(TestAppLayout.EXECUTABLE_RECORD, "utf8")).trim();
    const end = executable.lastIndexOf(HostedMacGrants.EXECUTABLES);
    if (end < 0)
      throw new Error(`The test app's executable ${executable} is not inside an app bundle.`);
    const bundle = executable.slice(0, end);
    const identifier = (await run(HostedMacGrants.PLUTIL, ["-extract", "CFBundleIdentifier", "raw", path.join(bundle, "Contents", "Info.plist")], { encoding: "utf8" })).stdout.trim();
    if (!HostedMacGrants.IDENTIFIER.test(identifier))
      throw new Error(`The test app's bundle identifier ${JSON.stringify(identifier)} is not a plain identifier.`);
    const requirement = await HostedMacGrants.readRequirementAsync(bundle);
    const now = Math.floor(Date.now() / 1000);
    const rows = HostedMacGrants.SERVICES.map(t => `('${t}','${identifier}',0,2,4,1,X'${requirement}',NULL,0,'UNUSED',NULL,0,${now},NULL,NULL,'UNUSED',${now})`);
    await run(HostedMacGrants.SUDO, [HostedMacGrants.SQLITE, HostedMacGrants.DATABASE, `INSERT OR REPLACE INTO access VALUES ${rows.join(",")};`]);
    const granted = (await run(HostedMacGrants.SUDO, [HostedMacGrants.SQLITE, HostedMacGrants.DATABASE, `SELECT service FROM access WHERE client = '${identifier}' AND client_type = 0 AND auth_value = 2 ORDER BY service;`], { encoding: "utf8" })).stdout.trim().split("\n");
    if (granted.join(" ") !== HostedMacGrants.SERVICES.join(" "))
      throw new Error(`The runner's TCC database grants ${identifier} ${JSON.stringify(granted)}, not ${HostedMacGrants.SERVICES.join(" and ")}.`);
    process.stdout.write(`Granted ${HostedMacGrants.SERVICES.join(" and ")} to ${identifier} on this GitHub-hosted runner.\n`);
  }

  private static async readRequirementAsync(bundle: string): Promise<string> {
    const signature = await run(HostedMacGrants.CODESIGN, ["--display", "--requirements", "-", bundle], { encoding: "utf8" });
    const line = `${signature.stdout}\n${signature.stderr}`.split("\n").find(t => t.startsWith(HostedMacGrants.REQUIREMENT_PREFIX));
    if (line === undefined)
      throw new Error(`codesign names no designated requirement for ${bundle}.`);
    const output = path.join(await mkdtemp(path.join(tmpdir(), "cu-grant-")), "requirement.bin");
    await run(HostedMacGrants.CSREQ, ["-r", `=${line.slice(HostedMacGrants.REQUIREMENT_PREFIX.length)}`, "-b", output]);
    return (await readFile(output)).toString("hex");
  }
}

await HostedMacGrants.runAsync();
