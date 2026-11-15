/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class BorderColorInvalidException extends ProtocolException {
  public override readonly name: string = "BorderColorInvalidException";
  public readonly color: string;

  public constructor(color: string) {
    super(Resources.formatInvalidColor(color));

    this.color = color;
  }
}
