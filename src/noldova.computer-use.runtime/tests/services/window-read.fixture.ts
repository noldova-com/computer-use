/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class WindowRead {
  public readonly facts: unknown;
  public readonly text: string;

  public constructor(facts: unknown, text: string) {
    this.facts = facts;
    this.text = text;
  }
}
