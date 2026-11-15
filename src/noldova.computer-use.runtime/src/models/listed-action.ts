/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";

import type { IComputerTool } from "../interfaces/i-computer-tool.ts";
import type { InputKind } from "./input-kind.ts";

export class ListedAction {
  public readonly input: JsonObject;
  public readonly kind: InputKind;
  public readonly tool: IComputerTool;

  public constructor(kind: InputKind, tool: IComputerTool, input: JsonObject) {
    this.input = input;
    this.kind = kind;
    this.tool = tool;
  }
}
