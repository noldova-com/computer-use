/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";

import type { IPermissionIntercept } from "../doubles/recording-permission-center.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

export class TypeCalls {
  public static readonly summary: string = "Types the note's title.";

  public static typing(text: string): JsonObject {
    return { text, summary: TypeCalls.summary };
  }

  public static async grantedAsync(maxTextChunkLength?: number, intercept?: IPermissionIntercept): Promise<RuntimeHarness> {
    const harness = await RuntimeHarness.startAsync(undefined, maxTextChunkLength, (request, signal) =>
      request.isRememberedOnly === true && intercept !== undefined ? intercept(request, signal) : null);
    await harness.grantAppAsync(RuntimeHarness.notes);

    return harness;
  }

  public static afterEachChunk(harness: RuntimeHarness, action: () => void): void {
    const sendAsync = harness.input.typeTextAsync.bind(harness.input);
    harness.input.typeTextAsync = async (target, chunk, signal) => {
      await sendAsync(target, chunk, signal);
      action();
    };
  }
}
