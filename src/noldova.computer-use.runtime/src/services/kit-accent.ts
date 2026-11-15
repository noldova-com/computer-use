/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { BorderColorSetRequest, ProtocolException } from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { BackendFailures } from "./backend-failures.ts";

export class KitAccent {
  public static readonly file: string = fileURLToPath(new URL(Resources.kitAccentPath, import.meta.url));

  public static async readAsync(file: string, log: (line: string) => void): Promise<string> {
    try {
      return BorderColorSetRequest.fromJson(JSON.parse(await readFile(file, Resources.textEncoding))).color;
    } catch (error) {
      if (!KitAccent.isUnreadable(error))
        throw error;
      log(Resources.formatKitAccentUnread(String(error)));

      return Resources.fallbackBorderColor;
    }
  }

  private static isUnreadable(error: unknown): boolean {
    return error instanceof SyntaxError || error instanceof JsonException || error instanceof ProtocolException || BackendFailures.isSystemError(error);
  }
}
