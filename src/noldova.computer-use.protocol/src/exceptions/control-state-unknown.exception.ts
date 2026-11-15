/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class ControlStateUnknownException extends ProtocolException {
  public override readonly name: string = "ControlStateUnknownException";
  public readonly value: unknown;

  public constructor(value: unknown) {
    super(Resources.formatUnknownControlState(String(value)));

    this.value = value;
  }
}
