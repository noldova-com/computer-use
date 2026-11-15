/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonException, JsonReader } from "@noldova/context.json";

import { Resources } from "../resources.ts";

export class WireFormReader {
  public static read(value: unknown, model: string, fields: readonly string[]): JsonReader {
    const reader = JsonReader.fromValue(value, model);
    for (const field of Object.keys(reader.toJson()))
      if (!fields.includes(field))
        throw new JsonException(Resources.unknownField, Resources.formatFieldPath(reader.path, field));

    return reader;
  }
}
