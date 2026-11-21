/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonReader, type JsonObject } from "@noldova/context.json";

export class AppLockfile {
  private static readonly PACKAGES: string = "packages";
  private static readonly ROOT: string = "";
  private static readonly INTEGRITY: string = "integrity";
  private static readonly INSTALLED: string = "node_modules/";

  public static rewrite(text: string, dependencies: JsonObject, archives: ReadonlyMap<string, JsonObject>): string {
    const lock = JsonReader.parse(text);
    const packages = lock.readObject(AppLockfile.PACKAGES);
    const entries = Object.keys(packages.toJson()).map(t => [t, AppLockfile.rewriteEntry(t, packages.readObject(t), dependencies, archives)]);
    return `${JSON.stringify({ ...lock.toJson(), packages: Object.fromEntries(entries) }, null, 2)}\n`;
  }

  private static rewriteEntry(key: string, entry: JsonReader, dependencies: JsonObject, archives: ReadonlyMap<string, JsonObject>): JsonObject {
    if (key === AppLockfile.ROOT)
      return { ...entry.toJson(), dependencies };
    const archive = archives.get(key.split(AppLockfile.INSTALLED).at(-1) ?? key);
    if (archive === undefined)
      return entry.toJson();
    return { ...Object.fromEntries(Object.entries(entry.toJson()).filter(([t]) => t !== AppLockfile.INTEGRITY)), ...archive };
  }
}
