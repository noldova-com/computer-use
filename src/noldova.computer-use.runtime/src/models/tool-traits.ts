/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IToolDescriptor, type IToolLimits, ToolRisk } from "@noldova/desktop.runtime";

import { Resources } from "../resources.ts";

export class ToolTraits {
  public static readonly imageLimits: IToolLimits = {
    imageBytes: Resources.maxImageBytes,
    imageLongEdge: Resources.maxImageLongEdge,
    imagePixels: Resources.maxImagePixels
  };

  public static read(name: string, description: string, inputSchema: JsonObject, outputSchema: JsonObject | null, limits: IToolLimits | null = null): IToolDescriptor {
    return {
      name,
      description,
      inputSchema,
      ...outputSchema === null ? {} : { outputSchema },
      hints: { isReadOnly: true, isDestructive: false, isOpenWorld: false },
      risk: { default: ToolRisk.Low, maximum: ToolRisk.High },
      deadline: { default: Resources.readDeadlineMs, maximum: Resources.maxDeadlineMs },
      ...limits === null ? {} : { limits }
    };
  }

  public static request(name: string, description: string, inputSchema: JsonObject, outputSchema: JsonObject): IToolDescriptor {
    return {
      name,
      description,
      inputSchema,
      outputSchema,
      hints: { isReadOnly: false, isDestructive: false, isOpenWorld: false },
      risk: { default: ToolRisk.Medium, maximum: ToolRisk.High },
      isResumable: true,
      deadline: { default: Resources.requestDeadlineMs, maximum: Resources.maxDeadlineMs }
    };
  }

  public static input(name: string, description: string, inputSchema: JsonObject, outputSchema: JsonObject, deadlineMs: number = Resources.inputDeadlineMs): IToolDescriptor {
    return {
      name,
      description,
      inputSchema,
      outputSchema,
      hints: { isReadOnly: false, isDestructive: true, isOpenWorld: false },
      risk: { default: ToolRisk.Medium, maximum: ToolRisk.High },
      isResumable: false,
      marksSending: true,
      deadline: { default: deadlineMs, maximum: Resources.maxDeadlineMs },
      nextTool: Resources.screenshotName
    };
  }
}
