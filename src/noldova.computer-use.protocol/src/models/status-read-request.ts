/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { WireFormReader } from "../services/wire-form.reader.ts";

export class StatusReadRequest {
  public static readonly method: string = Resources.statusReadMethod;

  public static fromJson(value: unknown): StatusReadRequest {
    WireFormReader.read(value, Resources.statusReadRequestModel, []);
    return new StatusReadRequest();
  }

  public toJson(): JsonObject {
    return {};
  }
}
