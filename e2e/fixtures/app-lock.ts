/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { JsonReader } from "@noldova/context.json";

export class AppLock {
  public static readonly MANIFEST: string = "package.json";
  public static readonly LOCKFILE: string = "package-lock.json";
  private static readonly DEPENDENCY_FIELDS: readonly string[] = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  private static readonly ENTRY_FIELDS: readonly string[] = ["version", "resolved", "integrity", "link"];
  private static readonly INSTALLED: string = "node_modules/";

  public static async readAsync(file: string): Promise<JsonReader> {
    return JsonReader.parse(await readFile(file, "utf8"));
  }

  public static async staleWorkspacesAsync(folder: string): Promise<readonly string[]> {
    const manifest = await AppLock.readAsync(path.join(folder, AppLock.MANIFEST));
    const packages = (await AppLock.readAsync(path.join(folder, AppLock.LOCKFILE))).readObject("packages");
    const workspaces = ["", ...manifest.hasField("workspaces") ? manifest.readStringArray("workspaces") : []];
    const stale = await Promise.all(workspaces.map(async t => {
      const own = t === "" ? manifest : await AppLock.readAsync(path.join(folder, t, AppLock.MANIFEST));
      return !packages.hasField(t) || AppLock.pinsOf(own) !== AppLock.pinsOf(packages.readObject(t)) ? [t] : [];
    }));
    return stale.flat();
  }

  public static changedEntries(before: JsonReader, after: JsonReader): readonly string[] {
    const was = before.readObject("packages");
    const now = after.readObject("packages");
    return Object.keys(was.toJson()).filter(t => t.startsWith(AppLock.INSTALLED))
      .filter(t => !now.hasField(t) || AppLock.entryOf(was.readObject(t)) !== AppLock.entryOf(now.readObject(t)));
  }

  private static pinsOf(entry: JsonReader): string {
    return JSON.stringify(AppLock.DEPENDENCY_FIELDS.map(t => entry.hasField(t)
      ? Object.entries(entry.readObject(t).toJson()).map(([name, range]) => `${name}@${JSON.stringify(range)}`).toSorted()
      : []));
  }

  private static entryOf(entry: JsonReader): string {
    return JSON.stringify(AppLock.ENTRY_FIELDS.map(t => entry.hasField(t) ? entry.readValue(t) : null));
  }
}
