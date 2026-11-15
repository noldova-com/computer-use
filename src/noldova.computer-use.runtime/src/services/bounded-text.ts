/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Readable } from "node:stream";
import { finished } from "node:stream/promises";

import { Resources } from "../resources.ts";

export class BoundedText {
  public static async readAsync(stream: Readable, maxCharacters: number): Promise<string> {
    let text = "";
    stream.setEncoding(Resources.textEncoding).on("data", (chunk: string) => {
      if (text.length < maxCharacters)
        text += chunk.slice(0, maxCharacters - text.length);
    });
    await finished(stream);

    return text;
  }
}
