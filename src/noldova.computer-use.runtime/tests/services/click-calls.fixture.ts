/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject, JsonValue } from "@noldova/computer-use.protocol";

import type { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { ScreenImages } from "./screen-images.fixture.ts";

export class ClickCalls {
  public static readonly summary: string = "Opens the note.";

  public static clicking(x: number, y: number, more: Record<string, JsonValue> = {}): JsonObject {
    return { x, y, ...more, summary: ClickCalls.summary };
  }

  public static async shotAsync(scale: number = 1): Promise<RuntimeHarness> {
    const harness = await ScreenImages.startAsync();
    await harness.callAsync("computer_screenshot", { scale });

    return harness;
  }
}
