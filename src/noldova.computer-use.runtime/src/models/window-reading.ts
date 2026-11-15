/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ListedControls } from "./listed-controls.ts";
import type { ReadControl } from "./read-control.ts";
import type { ScreenFrame } from "./screen-frame.ts";

export class WindowReading {
  private readonly under: ReadonlyMap<string, ReadControl>;
  private readonly whole: ReadonlyMap<string, ReadControl>;

  public readonly frame: ScreenFrame;
  public readonly nextNumber: number;
  public readonly windowId: string;

  private constructor(frame: ScreenFrame, windowId: string, whole: ReadonlyMap<string, ReadControl>, under: ReadonlyMap<string, ReadControl>, nextNumber: number) {
    this.frame = frame;
    this.nextNumber = nextNumber;
    this.under = under;
    this.whole = whole;
    this.windowId = windowId;
  }

  public static of(frame: ScreenFrame, windowId: string, listed: ListedControls): WindowReading {
    return new WindowReading(frame, windowId, WindowReading.byId(listed.controls), new Map<string, ReadControl>(), listed.nextNumber);
  }

  public isOf(frame: ScreenFrame, windowId: string): boolean {
    return frame.isSameAs(this.frame) && windowId === this.windowId;
  }

  public find(id: string): ReadControl | undefined {
    return this.whole.get(id) ?? this.under.get(id);
  }

  public withUnder(listed: ListedControls): WindowReading {
    return new WindowReading(this.frame, this.windowId, this.whole, WindowReading.byId(listed.controls), listed.nextNumber);
  }

  private static byId(controls: readonly ReadControl[]): ReadonlyMap<string, ReadControl> {
    return new Map(controls.map(t => [t.id, t]));
  }
}
