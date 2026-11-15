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

import { TestAppLayout } from "./test-app-layout.ts";

export class PackedPart {
  public readonly name: string;
  public readonly version: string;
  public readonly archive: string;

  private constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
    this.archive = path.join(TestAppLayout.ARCHIVES_FOLDER, `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`);
  }

  public static async readAsync(folder: string): Promise<PackedPart> {
    const manifest = JsonReader.parse(await readFile(path.join(folder, "package.json"), "utf8"));
    return new PackedPart(manifest.readString("name"), manifest.readString("version"));
  }

  public fileSpecifier(from: string): string {
    return `file:${path.relative(from, this.archive).split(path.sep).join(path.posix.sep)}`;
  }
}
