/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ReadControl } from "./read-control.ts";

export class ListedControls {
  public readonly controls: readonly ReadControl[];
  public readonly leftOut: number;
  public readonly listed: number;
  public readonly nextNumber: number;
  public readonly text: string;

  public constructor(text: string, controls: readonly ReadControl[], listed: number, leftOut: number, nextNumber: number) {
    this.controls = controls;
    this.leftOut = leftOut;
    this.listed = listed;
    this.nextNumber = nextNumber;
    this.text = text;
  }
}
