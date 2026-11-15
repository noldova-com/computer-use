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

export class KeyCalls {
  public static readonly summary: string = "Saves the note.";

  public static pressing(keys: string, repeat?: number): JsonObject {
    return repeat === undefined ? { keys, summary: KeyCalls.summary } : { keys, repeat, summary: KeyCalls.summary };
  }

  public static async grantedAsync(intercept?: IPermissionIntercept, appShortcuts?: readonly string[]): Promise<RuntimeHarness> {
    const harness = await RuntimeHarness.startAsync(undefined, undefined, (request, signal) =>
      request.isRememberedOnly === true && intercept !== undefined ? intercept(request, signal) : null, appShortcuts);
    await harness.grantAppAsync(RuntimeHarness.notes);

    return harness;
  }

  public static pressed(harness: RuntimeHarness): readonly string[] {
    return harness.input.sent.map(t => [...t.modifiers.map(u => u.value), t.key?.value].join("+"));
  }

  public static afterEachPress(harness: RuntimeHarness, action: () => void): void {
    const sendAsync = harness.input.pressKeyAsync.bind(harness.input);
    harness.input.pressKeyAsync = async (target, key, modifiers, signal) => {
      await sendAsync(target, key, modifiers, signal);
      action();
    };
  }
}
