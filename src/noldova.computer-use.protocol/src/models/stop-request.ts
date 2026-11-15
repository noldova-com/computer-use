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

export class StopRequest {
  public static readonly method: string = Resources.stopMethod;

  public static fromJson(value: unknown): StopRequest {
    WireFormReader.read(value, Resources.stopRequestModel, []);
    return new StopRequest();
  }

  public toJson(): JsonObject {
    return {};
  }
}
