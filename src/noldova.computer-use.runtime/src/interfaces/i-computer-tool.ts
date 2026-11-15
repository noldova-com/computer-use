/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import type { ToolResult } from "@noldova/desktop.runtime";

import type { IToolCallContext } from "./i-tool-call-context.ts";

export interface IComputerTool {
  handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult>;
}
