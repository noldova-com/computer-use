/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IRuntimePart, IRuntimePartContext } from "@noldova/desktop.runtime";

/**
 * The agent double's runtime part: one agent session whose tool calls, and the answers to their permission requests, the end-to-end tests drive through its methods.
 */
export declare class RuntimePart implements IRuntimePart {
  /**
   * Registers the methods and the permission answerer.
   */
  public activateAsync(context: IRuntimePartContext): Promise<void>;

  /**
   * Ends the session and withdraws the answerer.
   */
  public deactivateAsync(): Promise<void>;
}
