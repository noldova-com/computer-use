/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { BorderColorInvalidException } from "../exceptions/border-color-invalid.exception.ts";
import { Resources } from "../resources.ts";
import { WireFormReader } from "../services/wire-form.reader.ts";

export class BorderColorSetRequest {
  public static readonly method: string = Resources.borderColorSetMethod;

  public readonly color: string;

  public constructor(color: string) {
    if (!Resources.hexColorPattern.test(color))
      throw new BorderColorInvalidException(color);

    this.color = color.toUpperCase();
  }

  public static fromJson(value: unknown): BorderColorSetRequest {
    const reader = WireFormReader.read(value, Resources.borderColorSetRequestModel, [Resources.colorField]);
    return new BorderColorSetRequest(reader.readString(Resources.colorField));
  }

  public toJson(): JsonObject {
    return { color: this.color };
  }
}
